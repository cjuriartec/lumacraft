import { NextResponse } from "next/server";

import { resolveCollectionRecordLabel } from "@/modules/collection/domain/services/record-label.service";
import { RenderRecordDocumentPdfUseCase } from "@/modules/document/application/use-cases/render-record-document-pdf.use-case";
import { resolveDocumentRouteContext } from "@/modules/document/infrastructure/document-server";
import type { TemplateBlocks } from "@/modules/template/domain/types/template-blocks";
import { SupabaseTemplateAssetUrlResolverAdapter } from "@/modules/template/infrastructure/adapters/supabase-template-asset-url-resolver.adapter";
import { normalizePdfImageSources } from "@/modules/template/presentation/lib/template-pdf-image-utils";
import { renderTemplateToPdfBuffer } from "@/modules/template/presentation/lib/template-pdf-renderer";
import { createClient } from "@/shared/infrastructure/supabase/server";

interface RouteParams {
  params: Promise<{
    id: string;
    recordId: string;
    templateId: string;
  }>;
}

function statusForError(code?: string) {
  if (code === "FORBIDDEN") return 403;
  if (
    code === "NOT_FOUND" ||
    code === "DOCUMENT_NOT_FOUND" ||
    code === "WORKSPACE_COLLECTION_MISMATCH"
  ) {
    return 404;
  }
  return 400;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id: collectionId, recordId, templateId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 },
    );
  }

  const contextResult = await resolveDocumentRouteContext({
    collectionId,
    recordId,
    supabase,
    templateId,
    userId: user.id,
  });

  if (!contextResult.ok) {
    return NextResponse.json(
      { error: { code: contextResult.error.code, message: contextResult.error.message } },
      { status: statusForError(contextResult.error.code) },
    );
  }

  const useCase = new RenderRecordDocumentPdfUseCase(contextResult.value.documentRepository, {
    render: async (blocks: TemplateBlocks, title, pageConfig) => {
      const resolver = new SupabaseTemplateAssetUrlResolverAdapter(supabase);
      const resolvedBlocks = await normalizePdfImageSources(blocks, resolver);
      const resolvedPageConfig = pageConfig ? { ...pageConfig } : pageConfig;

      if (resolvedPageConfig?.header?.blocks) {
        resolvedPageConfig.header.blocks = await normalizePdfImageSources(
          resolvedPageConfig.header.blocks,
          resolver,
        );
      }
      if (resolvedPageConfig?.footer?.blocks) {
        resolvedPageConfig.footer.blocks = await normalizePdfImageSources(
          resolvedPageConfig.footer.blocks,
          resolver,
        );
      }

      return renderTemplateToPdfBuffer(resolvedBlocks, title, resolvedPageConfig);
    },
  });
  const title = `${contextResult.value.template.name} - ${resolveCollectionRecordLabel(
    contextResult.value.record,
    contextResult.value.collection,
  )}`;
  const pdfResult = await useCase.execute({
    templateId,
    recordId,
    title,
    pageConfig: contextResult.value.template.pageConfig,
  });

  if (!pdfResult.ok) {
    return NextResponse.json(
      { error: { code: pdfResult.error.code, message: pdfResult.error.message } },
      { status: statusForError(pdfResult.error.code) },
    );
  }

  return new NextResponse(new Uint8Array(pdfResult.value), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${title.replace(/"/g, "")}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
