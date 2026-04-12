import { SupabaseClient } from "@supabase/supabase-js";

import { composeAccountAISystemPrompt } from "@/modules/ai/application/services/account-ai-system-prompt";
import { AccountScopedAISettingsResolver } from "@/modules/ai/application/services/account-scoped-ai-settings-resolver";
import { GetAccountAISettingsUseCase } from "@/modules/ai/application/use-cases/get-account-ai-settings.use-case";
import { SaveAccountAISettingsUseCase } from "@/modules/ai/application/use-cases/save-account-ai-settings.use-case";
import { EdgeFunctionAIProviderFactory } from "@/modules/ai/infrastructure/factories/edge-function-ai-provider.factory";
import { SupabaseAccountAISettingsRepository } from "@/modules/ai/infrastructure/repositories/supabase-account-ai-settings.repository";
import { AuthzUseCaseFactory } from "@/modules/authorization/application/authz-use-case.factory";
import { CollectionUseCaseFactory } from "@/modules/collection/application/collection-use-case.factory";
import { Collection } from "@/modules/collection/domain/entities/collection.entity";
import { DataRecord } from "@/modules/collection/domain/entities/record.entity";
import { SupabaseRecordRepository } from "@/modules/collection/infrastructure/repositories/supabase-record.repository";
import { RecordDocument } from "@/modules/document/domain/entities/record-document.entity";
import { RecordDocumentPreviewPayload } from "@/modules/document/presentation/types/record-document";
import { TEMPLATE_PREVIEW_MAX_EAGER_DEPTH } from "@/modules/template/application/constants/template-preview.constants";
import { TemplateCompilationService } from "@/modules/template/application/services/template-compilation.service";
import { GenerateTemplatePreviewUseCase } from "@/modules/template/application/use-cases/generate-template-preview.use-case";
import { Template } from "@/modules/template/domain/entities/template.entity";
import { TemplateBlocks } from "@/modules/template/domain/types/template-blocks";
import { EagerLoadTemplateContextResolverAdapter } from "@/modules/template/infrastructure/adapters/eager-load-template-context-resolver.adapter";
import { SupabaseTemplateAssetUrlResolverAdapter } from "@/modules/template/infrastructure/adapters/supabase-template-asset-url-resolver.adapter";
import { SupabaseTemplateRepository } from "@/modules/template/infrastructure/repositories/supabase-template.repository";
import { SupabaseTemplateAIBlockCacheRepository } from "@/modules/template/infrastructure/repositories/supabase-template-ai-block-cache.repository";
import { SupabaseTemplatePreviewCacheRepository } from "@/modules/template/infrastructure/repositories/supabase-template-preview-cache.repository";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { createAdminClientOrNull } from "@/shared/infrastructure/supabase/admin";
import { hashStableValue } from "@/shared/lib/stable-hash";

import { SupabaseRecordDocumentRepository } from "./repositories/supabase-record-document.repository";

interface DocumentRouteContext {
  accountId: string;
  collection: Collection;
  currentDocument: RecordDocument | null;
  documentRepository: SupabaseRecordDocumentRepository;
  permissions: {
    canRead: boolean;
    canUpdate: boolean;
  };
  record: DataRecord;
  template: Template;
}

function resolveEdgeFunctionUrl(functionName: string): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return null;
  }

  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/${functionName}`;
}

function resolveEdgeFunctionKey(): string | null {
  return (
    process.env.SUPABASE_SECRET_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? null
  );
}

function buildTemplateAISettingsHash(params: {
  settings: Record<string, unknown>;
  systemInstruction: string;
}) {
  return hashStableValue({
    settings: params.settings,
    systemInstruction: params.systemInstruction,
  });
}

function toLabelValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    return value
      .map((item) => toLabelValue(item))
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "object" && value !== null) {
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.name === "string" && candidate.name.trim().length > 0) {
      return candidate.name.trim();
    }
    if (typeof candidate.label === "string" && candidate.label.trim().length > 0) {
      return candidate.label.trim();
    }
  }

  return "";
}

export function resolveRecordLabel(record: DataRecord, collection: Collection): string {
  const primaryFieldName = collection.primaryFieldName;
  if (primaryFieldName) {
    const label = toLabelValue(record.data[primaryFieldName]);
    if (label.length > 0) {
      return label;
    }
  }

  return record.id.slice(0, 8);
}

export function serializeRecordDocument(document: RecordDocument) {
  const json = document.toJSON();
  return {
    ...json,
    compiledAt: json.compiledAt?.toISOString() ?? null,
    lastEditedAt: json.lastEditedAt?.toISOString() ?? null,
    createdAt: json.createdAt?.toISOString() ?? null,
    updatedAt: json.updatedAt?.toISOString() ?? null,
  };
}

export function buildRecordDocumentPayload(params: {
  collection: Collection;
  document: RecordDocument;
  permissions: {
    canRead: boolean;
    canUpdate: boolean;
  };
  record: DataRecord;
  template: Template;
  warnings?: string[];
}): RecordDocumentPreviewPayload {
  return {
    document: serializeRecordDocument(params.document),
    template: {
      id: params.template.id,
      name: params.template.name,
      collectionId: params.template.collectionId ?? null,
      version: params.template.version,
    },
    record: {
      id: params.record.id,
      label: resolveRecordLabel(params.record, params.collection),
    },
    permissions: params.permissions,
    warnings: params.warnings ?? [],
  };
}

export async function resolveDocumentRouteContext(params: {
  collectionId: string;
  recordId: string;
  supabase: SupabaseClient;
  templateId: string;
  userId: string;
}): Promise<Result<DocumentRouteContext, DomainError>> {
  const permissionUseCase = AuthzUseCaseFactory.create(params.supabase).checkPermission();
  const [canReadResult, canUpdateResult] = await Promise.all([
    permissionUseCase.execute({
      userId: params.userId,
      collectionId: params.collectionId,
      action: "READ",
    }),
    permissionUseCase.execute({
      userId: params.userId,
      collectionId: params.collectionId,
      action: "UPDATE",
    }),
  ]);

  if (!canReadResult.ok) {
    return fail(canReadResult.error);
  }

  if (!canUpdateResult.ok) {
    return fail(canUpdateResult.error);
  }

  if (!canReadResult.value) {
    return fail(new DomainError("Forbidden", "FORBIDDEN"));
  }

  const collectionFactory = CollectionUseCaseFactory.create(params.supabase);
  const templateRepository = new SupabaseTemplateRepository(params.supabase);
  const recordRepository = new SupabaseRecordRepository(params.supabase);
  const documentRepository = new SupabaseRecordDocumentRepository(params.supabase);
  const [collectionResult, templateResult, recordResult, currentDocumentResult] = await Promise.all(
    [
      collectionFactory.getCollection().execute(params.collectionId),
      templateRepository.findById(params.templateId),
      recordRepository.findById(params.recordId),
      documentRepository.findByTemplateAndRecord(params.templateId, params.recordId),
    ],
  );

  if (!collectionResult.ok) {
    return fail(collectionResult.error);
  }

  if (!collectionResult.value) {
    return fail(new DomainError("Collection not found", "NOT_FOUND"));
  }

  if (!templateResult.ok) {
    return fail(templateResult.error);
  }

  if (!templateResult.value) {
    return fail(new DomainError("Template not found", "NOT_FOUND"));
  }

  if (!recordResult.ok) {
    return fail(recordResult.error);
  }

  if (!recordResult.value) {
    return fail(new DomainError("Record not found", "NOT_FOUND"));
  }

  if (!currentDocumentResult.ok) {
    return fail(currentDocumentResult.error);
  }

  if (templateResult.value.collectionId !== params.collectionId) {
    return fail(
      new DomainError(
        "Template collection does not match the requested collection",
        "TEMPLATE_CONTEXT_MISMATCH",
      ),
    );
  }

  if (recordResult.value.collectionId !== params.collectionId) {
    return fail(new DomainError("Record does not belong to the requested collection", "NOT_FOUND"));
  }

  if (recordResult.value.accountId !== templateResult.value.accountId) {
    return fail(
      new DomainError(
        "Record and template do not belong to the same account",
        "TEMPLATE_ACCOUNT_MISMATCH",
      ),
    );
  }

  if (collectionResult.value.accountId !== templateResult.value.accountId) {
    return fail(
      new DomainError(
        "Collection and template do not belong to the same account",
        "TEMPLATE_ACCOUNT_MISMATCH",
      ),
    );
  }

  return ok({
    accountId: templateResult.value.accountId,
    collection: collectionResult.value,
    currentDocument: currentDocumentResult.value,
    documentRepository,
    permissions: {
      canRead: true,
      canUpdate: canUpdateResult.value,
    },
    record: recordResult.value,
    template: templateResult.value,
  });
}

export async function createDocumentPreviewCompiler(params: {
  accountId: string;
  blocks: TemplateBlocks;
  collectionId: string;
  isAdmin: boolean;
  recordId: string;
  requestId: string;
  signal?: AbortSignal;
  supabase: SupabaseClient;
  template: Template;
  templateId: string;
}): Promise<
  Result<
    {
      execute: () => ReturnType<GenerateTemplatePreviewUseCase["execute"]>;
    },
    DomainError
  >
> {
  const collectionFactory = CollectionUseCaseFactory.create(params.supabase);
  const repositoryClient = createAdminClientOrNull() ?? params.supabase;
  const templateRepository = new SupabaseTemplateRepository(params.supabase);
  const contextResolver = new EagerLoadTemplateContextResolverAdapter(
    collectionFactory.eagerLoadRecord(),
    collectionFactory.listFields(),
    collectionFactory.getCollection(),
  );
  const assetUrlResolver = new SupabaseTemplateAssetUrlResolverAdapter(params.supabase);
  const previewCacheRepository = new SupabaseTemplatePreviewCacheRepository(repositoryClient);
  const aiBlockCacheRepository = new SupabaseTemplateAIBlockCacheRepository(repositoryClient);
  const accountAISettingsRepository = new SupabaseAccountAISettingsRepository(repositoryClient);
  const accountAISettingsResolver = new AccountScopedAISettingsResolver(
    new GetAccountAISettingsUseCase(accountAISettingsRepository),
    new SaveAccountAISettingsUseCase(accountAISettingsRepository),
  );
  const resolvedAccountAISettings = await accountAISettingsResolver.resolve(
    params.accountId,
    process.env,
    {
      persistBootstrap: params.isAdmin,
    },
  );

  if (!resolvedAccountAISettings.ok) {
    return fail(resolvedAccountAISettings.error);
  }

  const edgeFunctionUrl = resolveEdgeFunctionUrl("ai-provider");
  const edgeFunctionKey = resolveEdgeFunctionKey();
  if (!edgeFunctionUrl || !edgeFunctionKey) {
    return fail(
      new DomainError(
        "Missing Supabase Edge Function configuration",
        "AI_EDGE_FUNCTION_NOT_CONFIGURED",
      ),
    );
  }

  const accountAISettings = resolvedAccountAISettings.value.settings;
  const aiProviderFactory = new EdgeFunctionAIProviderFactory({
    accountId: params.accountId,
    functionUrl: edgeFunctionUrl,
    functionKey: edgeFunctionKey,
    defaultProvider: accountAISettings.defaultProvider,
    defaultModel: accountAISettings.defaultModel,
    defaultTemperature: accountAISettings.defaultTemperature,
    defaultMaxTokens: accountAISettings.defaultMaxTokens,
    requestTimeoutMs: accountAISettings.requestTimeoutMs,
    providerOptions: accountAISettings.providerOptions,
    providerApiKeys: resolvedAccountAISettings.value.decryptedSecrets,
  });
  const aiSystemInstruction = composeAccountAISystemPrompt({
    settings: accountAISettings,
    mode: "structured_preview",
  });
  const aiSettingsHash = buildTemplateAISettingsHash({
    settings: {
      defaultProvider: accountAISettings.defaultProvider,
      defaultModel: accountAISettings.defaultModel,
      defaultTemperature: accountAISettings.defaultTemperature,
      defaultMaxTokens: accountAISettings.defaultMaxTokens,
      requestTimeoutMs: accountAISettings.requestTimeoutMs,
      providerOptions: accountAISettings.providerOptions,
      featureTemplateAI: accountAISettings.featureTemplateAI,
      featureTemplateLogic: accountAISettings.featureTemplateLogic,
      templatePreviewMaxAIBlocks: accountAISettings.templatePreviewMaxAIBlocks,
    },
    systemInstruction: aiSystemInstruction,
  });
  const compilationService = new TemplateCompilationService();
  const generatePreviewUseCase = new GenerateTemplatePreviewUseCase(
    templateRepository,
    contextResolver,
    aiProviderFactory,
    assetUrlResolver,
    compilationService,
  );

  return ok({
    execute: () =>
      generatePreviewUseCase.execute({
        requestId: params.requestId,
        templateId: params.templateId,
        accountId: params.accountId,
        collectionId: params.collectionId,
        recordId: params.recordId,
        blocks: params.blocks,
        template: params.template,
        aiSystemInstruction,
        aiSettingsHash,
        previewCache: previewCacheRepository,
        aiBlockCache: aiBlockCacheRepository,
        depth: TEMPLATE_PREVIEW_MAX_EAGER_DEPTH,
        signal: params.signal,
        options: {
          enableAI: accountAISettings.featureTemplateAI,
          enableLogic: accountAISettings.featureTemplateLogic,
          maxAiBlocks: Math.max(1, accountAISettings.templatePreviewMaxAIBlocks),
        },
      }),
  });
}
