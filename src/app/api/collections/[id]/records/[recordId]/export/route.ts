import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { composeAccountAISystemPrompt } from "@/modules/ai/application/services/account-ai-system-prompt";
import { AccountScopedAISettingsResolver } from "@/modules/ai/application/services/account-scoped-ai-settings-resolver";
import { GetAccountAISettingsUseCase } from "@/modules/ai/application/use-cases/get-account-ai-settings.use-case";
import { SaveAccountAISettingsUseCase } from "@/modules/ai/application/use-cases/save-account-ai-settings.use-case";
import { AIProviderFactoryPort } from "@/modules/ai/domain/ports/ai-provider-factory.port";
import { EdgeFunctionAIProviderFactory } from "@/modules/ai/infrastructure/factories/edge-function-ai-provider.factory";
import { SupabaseAccountAISettingsRepository } from "@/modules/ai/infrastructure/repositories/supabase-account-ai-settings.repository";
import { CollectionUseCaseFactory } from "@/modules/collection/application/collection-use-case.factory";
import { TEMPLATE_PREVIEW_MAX_EAGER_DEPTH } from "@/modules/template/application/constants/template-preview.constants";
import { GenerateTemplatePreviewUseCase } from "@/modules/template/application/use-cases/generate-template-preview.use-case";
import { EagerLoadTemplateContextResolverAdapter } from "@/modules/template/infrastructure/adapters/eager-load-template-context-resolver.adapter";
import { SupabaseTemplateAssetUrlResolverAdapter } from "@/modules/template/infrastructure/adapters/supabase-template-asset-url-resolver.adapter";
import { SupabaseTemplateRepository } from "@/modules/template/infrastructure/repositories/supabase-template.repository";
import { renderTemplateToPdfBuffer } from "@/modules/template/presentation/lib/template-pdf-renderer";
import { resolveAccountAccess } from "@/shared/infrastructure/supabase/account-access";
import { createAdminClient } from "@/shared/infrastructure/supabase/admin";
import { createClient } from "@/shared/infrastructure/supabase/server";

const bodySchema = z.object({
  templateId: z.string().min(1),
  format: z.enum(["pdf", "docx"]),
});

interface RouteParams {
  params: Promise<{
    id: string;
    recordId: string;
  }>;
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

export async function POST(request: NextRequest, { params }: RouteParams) {
  const requestId = crypto.randomUUID();
  const { id: collectionId, recordId } = await params;
  const bodyResult = bodySchema.safeParse(await request.json().catch(() => null));

  if (!bodyResult.success) {
    return NextResponse.json(
      { error: { message: "Invalid payload: requires templateId and format (pdf|docx)" } },
      { status: 400 },
    );
  }

  const { templateId, format } = bodyResult.data;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  // Find the template first to know the accountId
  const templateRepository = new SupabaseTemplateRepository(supabase);
  const templateResult = await templateRepository.findById(templateId);

  if (!templateResult.ok || !templateResult.value) {
    return NextResponse.json({ error: { message: "Template not found" } }, { status: 404 });
  }

  const accountId = templateResult.value.accountId;
  const templateName = templateResult.value.name;
  const blocks = templateResult.value.blocks;

  const accessResult = await resolveAccountAccess(supabase, user.id, accountId);

  if (!accessResult.ok || !accessResult.value.isMember) {
    return NextResponse.json({ error: { message: "Forbidden" } }, { status: 403 });
  }

  let adminClient: ReturnType<typeof createAdminClient>;
  try {
    adminClient = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: { message: "Server misconfiguration: SUPABASE_SECRET_KEY is not set" } },
      { status: 500 },
    );
  }
  const collectionFactory = CollectionUseCaseFactory.create(supabase);
  const contextResolver = new EagerLoadTemplateContextResolverAdapter(
    collectionFactory.eagerLoadRecord(),
    collectionFactory.listFields(),
    collectionFactory.getCollection(),
  );

  const accountAISettingsRepository = new SupabaseAccountAISettingsRepository(adminClient);
  const accountAISettingsResolver = new AccountScopedAISettingsResolver(
    new GetAccountAISettingsUseCase(accountAISettingsRepository),
    new SaveAccountAISettingsUseCase(accountAISettingsRepository),
  );

  const resolvedAccountAISettings = await accountAISettingsResolver.resolve(
    accountId,
    process.env,
    { persistBootstrap: accessResult.value.isAdmin },
  );

  if (!resolvedAccountAISettings.ok) {
    return NextResponse.json({ error: { message: "Error loading AI settings" } }, { status: 500 });
  }

  const accountAISettings = resolvedAccountAISettings.value.settings;
  const edgeFunctionUrl = resolveEdgeFunctionUrl("ai-provider");
  const edgeFunctionKey = resolveEdgeFunctionKey();

  let aiProviderFactory = null;
  if (edgeFunctionUrl && edgeFunctionKey) {
    aiProviderFactory = new EdgeFunctionAIProviderFactory({
      accountId,
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
  }

  const generatePreviewUseCase = new GenerateTemplatePreviewUseCase(
    templateRepository,
    contextResolver,
    aiProviderFactory as unknown as AIProviderFactoryPort,
    new SupabaseTemplateAssetUrlResolverAdapter(supabase),
  );

  const previewResult = await generatePreviewUseCase.execute({
    requestId,
    templateId,
    accountId,
    collectionId,
    recordId,
    blocks,
    aiSystemInstruction: composeAccountAISystemPrompt({
      settings: accountAISettings,
      mode: "structured_preview",
    }),
    depth: TEMPLATE_PREVIEW_MAX_EAGER_DEPTH,
    signal: request.signal,
    options: {
      enableAI: accountAISettings.featureTemplateAI,
      enableLogic: accountAISettings.featureTemplateLogic,
      maxAiBlocks: Math.max(1, accountAISettings.templatePreviewMaxAIBlocks),
    },
  });

  if (!previewResult.ok) {
    return NextResponse.json({ error: { message: previewResult.error.message } }, { status: 400 });
  }

  // -------------------------------------------------------------------------
  // PDF — rendered in-process via @react-pdf/renderer (high-fidelity)
  // -------------------------------------------------------------------------
  if (format === "pdf") {
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await renderTemplateToPdfBuffer(
        previewResult.value.blocks,
        templateName || "export",
      );
    } catch (renderError) {
      const message = renderError instanceof Error ? renderError.message : "PDF render failed";
      console.error("[export] PDF render error:", renderError);
      return NextResponse.json({ error: { message } }, { status: 500 });
    }

    const fileName = `${accountId}/${crypto.randomUUID()}.pdf`;

    const { error: uploadError } = await adminClient.storage
      .from("exports")
      .upload(fileName, pdfBuffer, { contentType: "application/pdf" });

    if (uploadError) {
      console.error("[export] Storage upload error:", uploadError);
      return NextResponse.json(
        { error: { message: uploadError.message || "Storage upload failed" } },
        { status: 500 },
      );
    }

    const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
      .from("exports")
      .createSignedUrl(fileName, 60 * 60); // 1 hour

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("[export] Signed URL error:", signedUrlError);
      return NextResponse.json(
        { error: { message: signedUrlError?.message || "Could not create signed URL" } },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: { url: signedUrlData.signedUrl } });
  }

  // -------------------------------------------------------------------------
  // Other formats (txt / docx fallback) — delegate to Edge Function
  // -------------------------------------------------------------------------
  const { data: edgeData, error: edgeError } = await supabase.functions.invoke<{
    url?: string;
    isError?: boolean;
    error?: string;
  }>("document-exporter", {
    body: {
      format,
      title: templateName || "export",
      accountId,
    },
  });

  if (edgeError) {
    return NextResponse.json(
      { error: { message: edgeError?.message || "Error generating document inside exporter" } },
      { status: 500 },
    );
  }

  if (edgeData?.isError || !edgeData?.url) {
    console.error("[export] EDGE FUNCTION INTERNAL ERROR:", edgeData?.error);
    return NextResponse.json(
      { error: { message: edgeData?.error || "Unknown edge function failure" } },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { url: edgeData.url } });
}
