import { AIProviderFactoryPort } from "@/modules/ai/domain/ports/ai-provider-factory.port";
import { TemplateAIBlockCachePort } from "@/modules/template/application/ports/template-ai-block-cache.port";
import { TemplatePreviewCachePort } from "@/modules/template/application/ports/template-preview-cache.port";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { hashStableValue } from "@/shared/lib/stable-hash";

import { TemplateBlocks } from "../../domain/types/template-blocks";
import { TemplateRuntimeContext } from "../../domain/types/template-runtime-context";
import { TemplateAssetUrlResolverPort } from "../ports/template-asset-url-resolver.port";
import {
  projectTemplateContextByPaths,
  projectTemplateContextWithTopLevelPrimitives,
} from "./template-context-projection";
import { analyzeTemplateDependencies } from "./template-dependency-analyzer";
import { TemplatePreviewEvent, TemplatePreviewResult } from "./template-preview.types";
import { compileTemplatePreviewBlocks } from "./template-preview-blocks-compiler";

interface TemplateCompilationServiceParams {
  requestId: string;
  templateId: string;
  templateVersion: number;
  accountId: string;
  collectionId: string;
  recordId: string;
  blocks: TemplateBlocks;
  context: TemplateRuntimeContext;
  aiProviderFactory: AIProviderFactoryPort;
  aiSettingsHash?: string;
  aiSystemInstruction?: string;
  assetUrlResolver?: TemplateAssetUrlResolverPort;
  previewCache?: TemplatePreviewCachePort;
  aiBlockCache?: TemplateAIBlockCachePort;
  onEvent?: (event: TemplatePreviewEvent) => void;
  signal?: AbortSignal;
  emitMetaEvent?: boolean;
  emitPendingEvents?: boolean;
  maxCompileConcurrency?: number;
  maxAiConcurrency?: number;
  maxAssetConcurrency?: number;
  options?: {
    enableAI?: boolean;
    enableLogic?: boolean;
    maxAiBlocks?: number;
  };
}

type SharedCompilationPayload = {
  blocks: TemplateBlocks;
  warnings: string[];
};

const previewCompilationInFlight = new Map<
  string,
  Promise<Result<SharedCompilationPayload, DomainError>>
>();

function failWith(code: string, message: string): Result<never, DomainError> {
  return fail(new DomainError(message, code));
}

function buildPreviewCacheKey(params: {
  templateId: string;
  templateVersion: number;
  collectionId: string;
  recordId: string;
  blocks: TemplateBlocks;
  context: TemplateRuntimeContext;
  aiSettingsHash?: string;
  options: {
    enableAI: boolean;
    enableLogic: boolean;
    maxAiBlocks: number;
  };
  dependencyPlan: ReturnType<typeof analyzeTemplateDependencies>;
}): string {
  const projectedContext = params.dependencyPlan.aiBlocks.some(
    (block) => block.contextMode === "full_root",
  )
    ? params.context.root
    : params.dependencyPlan.aiBlocks.some((block) => block.contextMode === "minimal_summary")
      ? projectTemplateContextWithTopLevelPrimitives(
          params.context.root,
          params.dependencyPlan.referencedPaths,
        )
      : projectTemplateContextByPaths(params.context.root, params.dependencyPlan.referencedPaths);

  return hashStableValue({
    templateId: params.templateId,
    templateVersion: params.templateVersion,
    collectionId: params.collectionId,
    recordId: params.recordId,
    context: projectedContext,
    blocks: params.blocks,
    aiSettingsHash: params.aiSettingsHash ?? null,
    options: params.options,
  });
}

export class TemplateCompilationService {
  public async compile(
    params: TemplateCompilationServiceParams,
  ): Promise<Result<TemplatePreviewResult, DomainError>> {
    const enableAI = params.options?.enableAI ?? true;
    const enableLogic = params.options?.enableLogic ?? true;
    const maxAiBlocks = Math.max(1, params.options?.maxAiBlocks ?? 3);
    const dependencyPlan = analyzeTemplateDependencies(params.blocks);

    if (enableAI && dependencyPlan.aiBlocks.length > maxAiBlocks) {
      return failWith(
        "TEMPLATE_COMPILE_ERROR",
        `Template exceeds AI block limit (${maxAiBlocks}) for a single preview execution`,
      );
    }

    if (params.emitMetaEvent ?? true) {
      params.onEvent?.({
        type: "meta",
        requestId: params.requestId,
        templateId: params.templateId,
        blocks: dependencyPlan.blockMetadata,
        warnings: [],
      });
    }

    const previewCacheKey = buildPreviewCacheKey({
      templateId: params.templateId,
      templateVersion: params.templateVersion,
      collectionId: params.collectionId,
      recordId: params.recordId,
      blocks: params.blocks,
      context: params.context,
      aiSettingsHash: params.aiSettingsHash,
      options: {
        enableAI,
        enableLogic,
        maxAiBlocks,
      },
      dependencyPlan,
    });

    if (params.previewCache) {
      const cachedResult = await params.previewCache.findByKey(previewCacheKey);
      if (cachedResult.ok && cachedResult.value) {
        console.info(
          JSON.stringify({
            level: "info",
            requestId: params.requestId,
            templateId: params.templateId,
            recordId: params.recordId,
            cacheHit: true,
          }),
        );
        const cachedPreviewResult: TemplatePreviewResult = {
          requestId: params.requestId,
          warnings: cachedResult.value.warnings,
          blocks: cachedResult.value.blocks,
        };

        params.onEvent?.({
          type: "done",
          requestId: params.requestId,
          warnings: cachedPreviewResult.warnings,
          blocks: cachedPreviewResult.blocks,
        });

        return ok(cachedPreviewResult);
      }
    }

    console.info(
      JSON.stringify({
        level: "info",
        requestId: params.requestId,
        templateId: params.templateId,
        recordId: params.recordId,
        cacheHit: false,
      }),
    );

    let pendingCompilation = previewCompilationInFlight.get(previewCacheKey);
    if (!pendingCompilation) {
      pendingCompilation = (async () => {
        const compiledBlocksResult = await compileTemplatePreviewBlocks({
          requestId: params.requestId,
          blocks: params.blocks,
          context: params.context,
          aiProviderFactory: params.aiProviderFactory,
          accountId: params.accountId,
          aiSettingsHash: params.aiSettingsHash,
          aiSystemInstruction: params.aiSystemInstruction,
          assetUrlResolver: params.assetUrlResolver,
          aiBlockCache: params.aiBlockCache,
          onEvent: params.onEvent,
          enableAI,
          enableLogic,
          emitPendingEvents: params.emitPendingEvents ?? true,
          maxCompileConcurrency: params.maxCompileConcurrency,
          maxAiConcurrency: params.maxAiConcurrency,
          maxAssetConcurrency: params.maxAssetConcurrency,
          signal: params.signal,
        });

        if (!compiledBlocksResult.ok) {
          return fail(compiledBlocksResult.error);
        }

        const sharedPayload: SharedCompilationPayload = {
          warnings: compiledBlocksResult.value.warnings,
          blocks: compiledBlocksResult.value.blocks,
        };

        if (params.previewCache) {
          const persistResult = await params.previewCache.save({
            cacheKey: previewCacheKey,
            accountId: params.accountId,
            templateId: params.templateId,
            templateVersion: params.templateVersion,
            recordId: params.recordId,
            blocks: sharedPayload.blocks,
            warnings: sharedPayload.warnings,
          });
          if (!persistResult.ok) {
            console.warn("[template-preview-cache] Unable to persist compiled preview", {
              code: persistResult.error.code,
              message: persistResult.error.message,
            });
          }
        }

        return ok(sharedPayload);
      })();

      previewCompilationInFlight.set(previewCacheKey, pendingCompilation);
    }

    try {
      const compilationResult = await pendingCompilation;
      if (!compilationResult.ok) {
        return fail(compilationResult.error);
      }

      const previewResult: TemplatePreviewResult = {
        requestId: params.requestId,
        warnings: compilationResult.value.warnings,
        blocks: compilationResult.value.blocks,
      };

      params.onEvent?.({
        type: "done",
        requestId: params.requestId,
        warnings: previewResult.warnings,
        blocks: previewResult.blocks,
      });

      return ok(previewResult);
    } finally {
      previewCompilationInFlight.delete(previewCacheKey);
    }
  }
}
