import { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { composeAccountAISystemPrompt } from "@/modules/ai/application/services/account-ai-system-prompt";
import { AccountScopedAISettingsResolver } from "@/modules/ai/application/services/account-scoped-ai-settings-resolver";
import { GetAccountAISettingsUseCase } from "@/modules/ai/application/use-cases/get-account-ai-settings.use-case";
import { SaveAccountAISettingsUseCase } from "@/modules/ai/application/use-cases/save-account-ai-settings.use-case";
import { EdgeFunctionAIProviderFactory } from "@/modules/ai/infrastructure/factories/edge-function-ai-provider.factory";
import { SupabaseAccountAISettingsRepository } from "@/modules/ai/infrastructure/repositories/supabase-account-ai-settings.repository";
import { CollectionUseCaseFactory } from "@/modules/collection/application/collection-use-case.factory";
import { TEMPLATE_PREVIEW_MAX_EAGER_DEPTH } from "@/modules/template/application/constants/template-preview.constants";
import { TemplateCompilationService } from "@/modules/template/application/services/template-compilation.service";
import { analyzeTemplateDependencies } from "@/modules/template/application/services/template-dependency-analyzer";
import { TemplatePreviewEvent } from "@/modules/template/application/services/template-preview.types";
import {
  isTemplateBlocks,
  type TemplateBlocks,
} from "@/modules/template/domain/types/template-blocks";
import { EagerLoadTemplateContextResolverAdapter } from "@/modules/template/infrastructure/adapters/eager-load-template-context-resolver.adapter";
import { SupabaseTemplateAssetUrlResolverAdapter } from "@/modules/template/infrastructure/adapters/supabase-template-asset-url-resolver.adapter";
import { SupabaseTemplateRepository } from "@/modules/template/infrastructure/repositories/supabase-template.repository";
import { SupabaseTemplateAIBlockCacheRepository } from "@/modules/template/infrastructure/repositories/supabase-template-ai-block-cache.repository";
import { SupabaseTemplatePreviewCacheRepository } from "@/modules/template/infrastructure/repositories/supabase-template-preview-cache.repository";
import { DomainError, fail, Result } from "@/shared/domain/result";
import { resolveAccountAccess } from "@/shared/infrastructure/supabase/account-access";
import { createAdminClientOrNull } from "@/shared/infrastructure/supabase/admin";
import { createClient } from "@/shared/infrastructure/supabase/server";
import { hashStableValue } from "@/shared/lib/stable-hash";

const bodySchema = z.object({
  accountId: z.string().min(1),
  collectionId: z.string().min(1),
  recordId: z.string().min(1),
  blocks: z.custom<TemplateBlocks>((value) => isTemplateBlocks(value), {
    message: "Template blocks payload is invalid",
  }),
  options: z
    .object({
      stream: z.boolean().optional(),
    })
    .optional(),
});

interface RouteParams {
  params: Promise<{
    templateId: string;
  }>;
}

function toErrorPayload(error: unknown, fallbackCode: string) {
  const code =
    error && typeof error === "object" && "code" in error && typeof error.code === "string"
      ? error.code
      : fallbackCode;

  const message = error instanceof Error ? error.message : "Unexpected error";

  return {
    error: {
      code,
      message,
    },
  };
}

function encodeSseEvent(event: TemplatePreviewEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

function statusForError(code?: string) {
  if (code === "UNAUTHORIZED") return 401;
  if (code === "FORBIDDEN") return 403;
  if (code === "NOT_FOUND") return 404;
  if (
    code === "DB_ERROR" ||
    code === "ACCOUNT_AI_SETTINGS_ERROR" ||
    code === "AI_EDGE_FUNCTION_NOT_CONFIGURED"
  ) {
    return 500;
  }

  return 400;
}

function createRepositoryClient(supabase: SupabaseClient) {
  return createAdminClientOrNull() ?? supabase;
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
  providerSecrets: Record<string, unknown>;
}) {
  return hashStableValue({
    settings: params.settings,
    systemInstruction: params.systemInstruction,
    providerSecrets: params.providerSecrets,
  });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const { templateId } = await params;
  const bodyResult = bodySchema.safeParse(await request.json().catch(() => null));

  if (!bodyResult.success) {
    return NextResponse.json(
      {
        error: {
          code: "TEMPLATE_PREVIEW_INVALID_INPUT",
          message: bodyResult.error.issues.map((issue) => issue.message).join("; "),
        },
      },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Unauthorized",
        },
      },
      { status: 401 },
    );
  }

  const accessResult = await resolveAccountAccess(supabase, user.id, bodyResult.data.accountId);

  if (!accessResult.ok) {
    return NextResponse.json(toErrorPayload(accessResult.error, "DB_ERROR"), {
      status: 500,
    });
  }

  if (!accessResult.value.isMember) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "You do not have access to this workspace",
        },
      },
      { status: 403 },
    );
  }

  const templateRepository = new SupabaseTemplateRepository(supabase);
  const templateHeaderResult = await templateRepository.findHeaderById(templateId);
  if (!templateHeaderResult.ok) {
    return NextResponse.json(toErrorPayload(templateHeaderResult.error, "DB_ERROR"), {
      status: 500,
    });
  }

  if (!templateHeaderResult.value) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Template not found",
        },
      },
      { status: 404 },
    );
  }

  if (templateHeaderResult.value.accountId !== bodyResult.data.accountId) {
    return NextResponse.json(
      {
        error: {
          code: "TEMPLATE_ACCOUNT_MISMATCH",
          message: "Template does not belong to the provided account",
        },
      },
      { status: 400 },
    );
  }

  if (!templateHeaderResult.value.collectionId) {
    return NextResponse.json(
      {
        error: {
          code: "TEMPLATE_CONTEXT_NOT_FOUND",
          message: "Template has no linked collection",
        },
      },
      { status: 400 },
    );
  }

  if (templateHeaderResult.value.collectionId !== bodyResult.data.collectionId) {
    return NextResponse.json(
      {
        error: {
          code: "TEMPLATE_CONTEXT_MISMATCH",
          message: "Template collection does not match the preview request collection",
        },
      },
      { status: 400 },
    );
  }

  const templateHeader = templateHeaderResult.value;

  const dependencyPlan = analyzeTemplateDependencies(bodyResult.data.blocks);
  const previewDepth = Math.min(TEMPLATE_PREVIEW_MAX_EAGER_DEPTH, dependencyPlan.depth);
  const shouldStream = bodyResult.data.options?.stream ?? true;
  const collectionFactory = CollectionUseCaseFactory.create(supabase);
  const eagerLoadUseCase = collectionFactory.eagerLoadRecord();
  const listFieldsUseCase = collectionFactory.listFields();
  const getCollectionUseCase = collectionFactory.getCollection();
  const contextResolver = new EagerLoadTemplateContextResolverAdapter(
    eagerLoadUseCase,
    listFieldsUseCase,
    getCollectionUseCase,
  );
  const assetUrlResolver = new SupabaseTemplateAssetUrlResolverAdapter(supabase);
  const repositoryClient = createRepositoryClient(supabase);
  const previewCacheRepository = new SupabaseTemplatePreviewCacheRepository(repositoryClient);
  const aiBlockCacheRepository = new SupabaseTemplateAIBlockCacheRepository(repositoryClient);
  const compilationService = new TemplateCompilationService();

  const executePreview = async (options: {
    onEvent?: (event: TemplatePreviewEvent) => void;
    signal?: AbortSignal;
    emitMetaEvent?: boolean;
    emitPendingEvents?: boolean;
  }): Promise<Result<unknown, DomainError>> => {
    const accountAISettingsRepository = new SupabaseAccountAISettingsRepository(repositoryClient);
    const accountAISettingsResolver = new AccountScopedAISettingsResolver(
      new GetAccountAISettingsUseCase(accountAISettingsRepository),
      new SaveAccountAISettingsUseCase(accountAISettingsRepository),
    );
    const resolvedAccountAISettings = await accountAISettingsResolver.resolve(
      bodyResult.data.accountId,
      process.env,
      {
        persistBootstrap: accessResult.value.isAdmin,
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
      accountId: bodyResult.data.accountId,
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
      providerSecrets: accountAISettings.providerSecrets,
    });
    const contextResult = await contextResolver.resolve({
      collectionId: bodyResult.data.collectionId,
      recordId: bodyResult.data.recordId,
      depth: previewDepth,
      dependencyPlan,
    });

    if (!contextResult.ok) {
      return contextResult;
    }

    return compilationService.compile({
      requestId,
      templateId,
      templateVersion: templateHeader.version,
      accountId: bodyResult.data.accountId,
      collectionId: bodyResult.data.collectionId,
      recordId: bodyResult.data.recordId,
      blocks: bodyResult.data.blocks,
      context: contextResult.value,
      aiProviderFactory,
      aiSettingsHash,
      aiSystemInstruction,
      assetUrlResolver,
      previewCache: previewCacheRepository,
      aiBlockCache: aiBlockCacheRepository,
      onEvent: options.onEvent,
      signal: options.signal,
      emitMetaEvent: options.emitMetaEvent,
      emitPendingEvents: options.emitPendingEvents,
      options: {
        enableAI: accountAISettings.featureTemplateAI,
        enableLogic: accountAISettings.featureTemplateLogic,
        maxAiBlocks: Math.max(1, accountAISettings.templatePreviewMaxAIBlocks),
      },
    });
  };

  if (!shouldStream) {
    const result = await executePreview({
      signal: request.signal,
      emitMetaEvent: true,
      emitPendingEvents: true,
    });

    if (!result.ok) {
      console.info(
        JSON.stringify({
          level: "info",
          requestId,
          templateId,
          accountId: bodyResult.data.accountId,
          mode: "non-stream",
          ok: false,
          code: result.error.code ?? "TEMPLATE_COMPILE_ERROR",
          latencyMs: Date.now() - startedAt,
        }),
      );
      return NextResponse.json(toErrorPayload(result.error, "TEMPLATE_COMPILE_ERROR"), {
        status: statusForError(result.error.code),
      });
    }

    console.info(
      JSON.stringify({
        level: "info",
        requestId,
        templateId,
        accountId: bodyResult.data.accountId,
        mode: "non-stream",
        ok: true,
        latencyMs: Date.now() - startedAt,
      }),
    );

    return NextResponse.json({ data: result.value });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const abortController = new AbortController();
      const timeoutMs = 45_000;
      const timeout = setTimeout(() => {
        abortController.abort("timeout");
      }, timeoutMs);
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode("event: ping\\ndata: {}\\n\\n"));
      }, 15_000);

      const relayEvent = (event: TemplatePreviewEvent) => {
        controller.enqueue(encoder.encode(encodeSseEvent(event)));
      };

      const onRequestAbort = () => {
        abortController.abort();
      };

      request.signal.addEventListener("abort", onRequestAbort);

      void (async () => {
        try {
          relayEvent({
            type: "meta",
            requestId,
            templateId,
            blocks: dependencyPlan.blockMetadata,
            warnings: [],
          });
          dependencyPlan.blockMetadata.forEach((blockMeta) => {
            relayEvent({
              type: "pending",
              requestId,
              blockId: blockMeta.blockId,
              blockIndex: blockMeta.blockIndex,
              blockType: blockMeta.blockType,
            });
          });

          const result = await executePreview({
            onEvent: relayEvent,
            signal: abortController.signal,
            emitMetaEvent: false,
            emitPendingEvents: false,
          });

          if (!result.ok) {
            relayEvent({
              type: "error",
              requestId,
              code:
                result.error.code ??
                (result.error.message === "Missing Supabase Edge Function configuration"
                  ? "AI_EDGE_FUNCTION_NOT_CONFIGURED"
                  : "TEMPLATE_COMPILE_ERROR"),
              message: result.error.message,
            });
          }

          console.info(
            JSON.stringify({
              level: "info",
              requestId,
              templateId,
              accountId: bodyResult.data.accountId,
              mode: "stream",
              ok: result.ok,
              code: result.ok ? undefined : (result.error.code ?? "TEMPLATE_COMPILE_ERROR"),
              latencyMs: Date.now() - startedAt,
            }),
          );
        } catch (error) {
          const payload = toErrorPayload(error, "TEMPLATE_COMPILE_ERROR");
          relayEvent({
            type: "error",
            requestId,
            code: payload.error.code,
            message: payload.error.message,
          });

          console.info(
            JSON.stringify({
              level: "info",
              requestId,
              templateId,
              accountId: bodyResult.data.accountId,
              mode: "stream",
              ok: false,
              code: payload.error.code,
              latencyMs: Date.now() - startedAt,
            }),
          );
        } finally {
          clearTimeout(timeout);
          clearInterval(heartbeat);
          request.signal.removeEventListener("abort", onRequestAbort);
          controller.close();
        }
      })();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
