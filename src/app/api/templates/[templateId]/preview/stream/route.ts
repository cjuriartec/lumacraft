import { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { composeAccountAISystemPrompt } from "@/modules/ai/application/services/account-ai-system-prompt";
import { AccountScopedAISettingsResolver } from "@/modules/ai/application/services/account-scoped-ai-settings-resolver";
import { GetAccountAISettingsUseCase } from "@/modules/ai/application/use-cases/get-account-ai-settings.use-case";
import { SaveAccountAISettingsUseCase } from "@/modules/ai/application/use-cases/save-account-ai-settings.use-case";
import { SupabaseAccountAISettingsRepository } from "@/modules/ai/infrastructure/repositories/supabase-account-ai-settings.repository";
import { CollectionUseCaseFactory } from "@/modules/collection/application/collection-use-case.factory";
import { TEMPLATE_PREVIEW_MAX_EAGER_DEPTH } from "@/modules/template/application/constants/template-preview.constants";
import { TemplatePreviewEvent } from "@/modules/template/application/services/template-preview.types";
import { GenerateTemplatePreviewUseCase } from "@/modules/template/application/use-cases/generate-template-preview.use-case";
import {
  isTemplateBlocks,
  type TemplateBlocks,
} from "@/modules/template/domain/types/template-blocks";
import { EagerLoadTemplateContextResolverAdapter } from "@/modules/template/infrastructure/adapters/eager-load-template-context-resolver.adapter";
import { SupabaseTemplateAssetUrlResolverAdapter } from "@/modules/template/infrastructure/adapters/supabase-template-asset-url-resolver.adapter";
import { SupabaseTemplateRepository } from "@/modules/template/infrastructure/repositories/supabase-template.repository";
import { resolveAccountAccess } from "@/shared/infrastructure/supabase/account-access";
import { createAdminClientOrNull } from "@/shared/infrastructure/supabase/admin";
import { createClient } from "@/shared/infrastructure/supabase/server";

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

function createRepositoryClient(supabase: SupabaseClient) {
  return createAdminClientOrNull() ?? supabase;
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
  const collectionFactory = CollectionUseCaseFactory.create(supabase);
  const eagerLoadUseCase = collectionFactory.eagerLoadRecord();
  const listFieldsUseCase = collectionFactory.listFields();
  const contextResolver = new EagerLoadTemplateContextResolverAdapter(
    eagerLoadUseCase,
    listFieldsUseCase,
  );
  const assetUrlResolver = new SupabaseTemplateAssetUrlResolverAdapter(supabase);
  const accountAISettingsRepository = new SupabaseAccountAISettingsRepository(
    createRepositoryClient(supabase),
  );
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
    return NextResponse.json(
      toErrorPayload(resolvedAccountAISettings.error, "ACCOUNT_AI_SETTINGS_ERROR"),
      {
        status: 500,
      },
    );
  }

  const aiProviderFactory = resolvedAccountAISettings.value.providerFactory;
  const accountAISettings = resolvedAccountAISettings.value.settings;
  const aiSystemInstruction = composeAccountAISystemPrompt({
    settings: accountAISettings,
    mode: "structured_preview",
  });

  const generatePreviewUseCase = new GenerateTemplatePreviewUseCase(
    templateRepository,
    contextResolver,
    aiProviderFactory,
    assetUrlResolver,
  );

  const shouldStream = bodyResult.data.options?.stream ?? true;
  const previewDepth = TEMPLATE_PREVIEW_MAX_EAGER_DEPTH;
  const enableAI = accountAISettings.featureTemplateAI;
  const enableLogic = accountAISettings.featureTemplateLogic;
  const maxAiBlocks = Math.max(1, accountAISettings.templatePreviewMaxAIBlocks);
  const timeoutMs = Math.max(5_000, accountAISettings.templatePreviewTimeoutMs);

  if (!shouldStream) {
    const result = await generatePreviewUseCase.execute({
      requestId,
      templateId,
      accountId: bodyResult.data.accountId,
      collectionId: bodyResult.data.collectionId,
      recordId: bodyResult.data.recordId,
      blocks: bodyResult.data.blocks,
      aiSystemInstruction,
      depth: previewDepth,
      signal: request.signal,
      options: {
        enableAI,
        enableLogic,
        maxAiBlocks,
      },
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
        status: 400,
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
          const result = await generatePreviewUseCase.execute({
            requestId,
            templateId,
            accountId: bodyResult.data.accountId,
            collectionId: bodyResult.data.collectionId,
            recordId: bodyResult.data.recordId,
            blocks: bodyResult.data.blocks,
            aiSystemInstruction,
            depth: previewDepth,
            onEvent: relayEvent,
            signal: abortController.signal,
            options: {
              enableAI,
              enableLogic,
              maxAiBlocks,
            },
          });

          if (!result.ok) {
            relayEvent({
              type: "error",
              requestId,
              code: result.error.code ?? "TEMPLATE_COMPILE_ERROR",
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
