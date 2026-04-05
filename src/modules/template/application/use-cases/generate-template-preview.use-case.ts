import { AIProviderFactoryPort } from "@/modules/ai/domain/ports/ai-provider-factory.port";
import { TEMPLATE_PREVIEW_MAX_EAGER_DEPTH } from "@/modules/template/application/constants/template-preview.constants";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import { Template } from "../../domain/entities/template.entity";
import { ITemplateRepository } from "../../domain/ports/template-repository.port";
import { TemplateBlocks } from "../../domain/types/template-blocks";
import { TemplateAssetUrlResolverPort } from "../ports/template-asset-url-resolver.port";
import { TemplateRuntimeContextResolverPort } from "../ports/template-runtime-context-resolver.port";
import { TemplatePreviewEvent, TemplatePreviewResult } from "../services/template-preview.types";
import { getTemplatePreviewBlockMetadata } from "../services/template-preview-block-metadata";
import { compileTemplatePreviewBlocks } from "../services/template-preview-blocks-compiler";

interface GenerateTemplatePreviewParams {
  requestId: string;
  templateId: string;
  accountId: string;
  collectionId: string;
  recordId: string;
  blocks: TemplateBlocks;
  depth?: number;
  onEvent?: (event: TemplatePreviewEvent) => void;
  signal?: AbortSignal;
  options?: {
    enableAI?: boolean;
    enableLogic?: boolean;
    maxAiBlocks?: number;
  };
}

function isTemplateAccountOwner(template: Template, accountId: string): boolean {
  return template.accountId === accountId;
}

function failWith(code: string, message: string): Result<never, DomainError> {
  return fail(new DomainError(message, code));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function countAiBlocks(blocks: TemplateBlocks, enableAI: boolean, enableLogic: boolean): number {
  if (!enableAI) {
    return 0;
  }

  let count = 0;

  for (const block of blocks) {
    if (!isRecord(block) || typeof block.type !== "string") {
      continue;
    }

    if (block.type === "template_ai") {
      count += 1;
      continue;
    }

    if (!enableLogic) {
      continue;
    }

    if (Array.isArray(block.children)) {
      count += countAiBlocks(block.children as TemplateBlocks, enableAI, enableLogic);
    }
  }

  return count;
}

export class GenerateTemplatePreviewUseCase {
  constructor(
    private readonly templateRepository: ITemplateRepository,
    private readonly contextResolver: TemplateRuntimeContextResolverPort,
    private readonly aiProviderFactory: AIProviderFactoryPort,
    private readonly assetUrlResolver?: TemplateAssetUrlResolverPort,
  ) {}

  public async execute(
    params: GenerateTemplatePreviewParams,
  ): Promise<Result<TemplatePreviewResult, DomainError>> {
    if (
      !params.requestId ||
      !params.templateId ||
      !params.accountId ||
      !params.collectionId ||
      !params.recordId
    ) {
      return failWith(
        "TEMPLATE_PREVIEW_INVALID_INPUT",
        "requestId, templateId, accountId, collectionId and recordId are required",
      );
    }

    const templateResult = await this.templateRepository.findById(params.templateId);
    if (!templateResult.ok) {
      return fail(templateResult.error);
    }

    if (!templateResult.value) {
      return failWith("NOT_FOUND", "Template not found");
    }

    if (!isTemplateAccountOwner(templateResult.value, params.accountId)) {
      return failWith(
        "TEMPLATE_ACCOUNT_MISMATCH",
        "Template does not belong to the provided account",
      );
    }

    if (!templateResult.value.collectionId) {
      return failWith("TEMPLATE_CONTEXT_NOT_FOUND", "Template has no linked collection");
    }

    if (templateResult.value.collectionId !== params.collectionId) {
      return failWith(
        "TEMPLATE_CONTEXT_MISMATCH",
        "Template collection does not match the preview request collection",
      );
    }

    const enableAI = params.options?.enableAI ?? true;
    const enableLogic = params.options?.enableLogic ?? true;
    const maxAiBlocks = Math.max(1, params.options?.maxAiBlocks ?? 3);

    if (countAiBlocks(params.blocks, enableAI, enableLogic) > maxAiBlocks) {
      return failWith(
        "TEMPLATE_COMPILE_ERROR",
        `Template exceeds AI block limit (${maxAiBlocks}) for a single preview execution`,
      );
    }

    const contextResult = await this.contextResolver.resolve({
      collectionId: params.collectionId,
      recordId: params.recordId,
      depth: params.depth ?? TEMPLATE_PREVIEW_MAX_EAGER_DEPTH,
    });

    if (!contextResult.ok) {
      return fail(contextResult.error);
    }

    params.onEvent?.({
      type: "meta",
      requestId: params.requestId,
      templateId: params.templateId,
      blocks: getTemplatePreviewBlockMetadata(params.blocks),
      warnings: [],
    });

    const compiledBlocksResult = await compileTemplatePreviewBlocks({
      requestId: params.requestId,
      blocks: params.blocks,
      context: contextResult.value,
      aiProviderFactory: this.aiProviderFactory,
      assetUrlResolver: this.assetUrlResolver,
      onEvent: params.onEvent,
      enableAI,
      enableLogic,
      signal: params.signal,
    });

    if (!compiledBlocksResult.ok) {
      const code = compiledBlocksResult.error.code ?? "TEMPLATE_COMPILE_ERROR";
      return fail(new DomainError(compiledBlocksResult.error.message, code));
    }

    const result: TemplatePreviewResult = {
      requestId: params.requestId,
      warnings: compiledBlocksResult.value.warnings,
      blocks: compiledBlocksResult.value.blocks,
    };

    params.onEvent?.({
      type: "done",
      requestId: result.requestId,
      warnings: result.warnings,
      blocks: result.blocks,
    });

    return ok(result);
  }
}
