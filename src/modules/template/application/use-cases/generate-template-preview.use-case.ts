import { AIProviderFactoryPort } from "@/modules/ai/domain/ports/ai-provider-factory.port";
import { TEMPLATE_PREVIEW_MAX_EAGER_DEPTH } from "@/modules/template/application/constants/template-preview.constants";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import { Template } from "../../domain/entities/template.entity";
import { ITemplateRepository } from "../../domain/ports/template-repository.port";
import { TemplateBlocks } from "../../domain/types/template-blocks";
import { TemplateRuntimeContext } from "../../domain/types/template-runtime-context";
import { TemplateAIBlockCachePort } from "../ports/template-ai-block-cache.port";
import { TemplateAssetUrlResolverPort } from "../ports/template-asset-url-resolver.port";
import { TemplatePreviewCachePort } from "../ports/template-preview-cache.port";
import { TemplateRuntimeContextResolverPort } from "../ports/template-runtime-context-resolver.port";
import { TemplateCompilationService } from "../services/template-compilation.service";
import { analyzeTemplateDependencies } from "../services/template-dependency-analyzer";
import { TemplatePreviewEvent, TemplatePreviewResult } from "../services/template-preview.types";

interface GenerateTemplatePreviewParams {
  requestId: string;
  templateId: string;
  accountId: string;
  collectionId: string;
  recordId: string;
  blocks: TemplateBlocks;
  aiSystemInstruction?: string;
  aiSettingsHash?: string;
  depth?: number;
  onEvent?: (event: TemplatePreviewEvent) => void;
  signal?: AbortSignal;
  template?: Template;
  context?: TemplateRuntimeContext;
  emitMetaEvent?: boolean;
  emitPendingEvents?: boolean;
  previewCache?: TemplatePreviewCachePort;
  aiBlockCache?: TemplateAIBlockCachePort;
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

export class GenerateTemplatePreviewUseCase {
  constructor(
    private readonly templateRepository: ITemplateRepository,
    private readonly contextResolver: TemplateRuntimeContextResolverPort,
    private readonly aiProviderFactory: AIProviderFactoryPort,
    private readonly assetUrlResolver?: TemplateAssetUrlResolverPort,
    private readonly compilationService = new TemplateCompilationService(),
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

    const templateResult = params.template
      ? ok(params.template)
      : await this.templateRepository.findById(params.templateId);
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

    const dependencyPlan = analyzeTemplateDependencies(params.blocks);
    const contextResult = params.context
      ? ok(params.context)
      : await this.contextResolver.resolve({
          collectionId: params.collectionId,
          recordId: params.recordId,
          depth: params.depth ?? Math.min(TEMPLATE_PREVIEW_MAX_EAGER_DEPTH, dependencyPlan.depth),
          dependencyPlan,
        });

    if (!contextResult.ok) {
      return fail(contextResult.error);
    }

    return this.compilationService.compile({
      requestId: params.requestId,
      templateId: params.templateId,
      templateVersion: templateResult.value.version,
      accountId: params.accountId,
      collectionId: params.collectionId,
      recordId: params.recordId,
      blocks: params.blocks,
      context: contextResult.value,
      aiProviderFactory: this.aiProviderFactory,
      aiSystemInstruction: params.aiSystemInstruction,
      aiSettingsHash: params.aiSettingsHash,
      assetUrlResolver: this.assetUrlResolver,
      previewCache: params.previewCache,
      aiBlockCache: params.aiBlockCache,
      onEvent: params.onEvent,
      emitMetaEvent: params.emitMetaEvent,
      emitPendingEvents: params.emitPendingEvents,
      signal: params.signal,
      options: params.options,
    });
  }
}
