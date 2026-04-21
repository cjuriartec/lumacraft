import { NextRequest, NextResponse } from "next/server";

import { CompileRecordDocumentIfMissingUseCase } from "@/modules/document/application/use-cases/compile-record-document-if-missing.use-case";
import {
  buildRecordDocumentPayload,
  createDocumentPreviewCompiler,
  resolveDocumentRouteContext,
} from "@/modules/document/infrastructure/document-server";
import { resolveAccountAccess } from "@/shared/infrastructure/supabase/account-access";
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
  if (code === "NOT_FOUND" || code === "WORKSPACE_COLLECTION_MISMATCH") return 404;
  if (code === "AI_EDGE_FUNCTION_NOT_CONFIGURED") return 500;
  return 400;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const requestId = crypto.randomUUID();
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

  const accessResult = await resolveAccountAccess(supabase, user.id, contextResult.value.accountId);
  if (!accessResult.ok || !accessResult.value.isMember) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Forbidden" } },
      { status: 403 },
    );
  }

  const compilerResult = await createDocumentPreviewCompiler({
    accountId: contextResult.value.accountId,
    blocks: contextResult.value.template.blocks,
    collectionId,
    isAdmin: accessResult.value.isAdmin,
    recordId,
    requestId,
    signal: request.signal,
    supabase,
    template: contextResult.value.template,
    templateId,
  });

  if (!compilerResult.ok) {
    return NextResponse.json(
      { error: { code: compilerResult.error.code, message: compilerResult.error.message } },
      { status: statusForError(compilerResult.error.code) },
    );
  }

  const useCase = new CompileRecordDocumentIfMissingUseCase(contextResult.value.documentRepository);
  const compiledResult = await useCase.execute({
    accountId: contextResult.value.accountId,
    collectionId,
    recordId,
    templateId,
    templateVersion: contextResult.value.template.version,
    userId: user.id,
    compilePreview: compilerResult.value,
    existingDocument: contextResult.value.currentDocument,
  });

  if (!compiledResult.ok) {
    return NextResponse.json(
      { error: { code: compiledResult.error.code, message: compiledResult.error.message } },
      { status: statusForError(compiledResult.error.code) },
    );
  }

  return NextResponse.json({
    data: buildRecordDocumentPayload({
      collection: contextResult.value.collection,
      document: compiledResult.value.document,
      permissions: contextResult.value.permissions,
      record: contextResult.value.record,
      template: contextResult.value.template,
      warnings: compiledResult.value.warnings,
    }),
  });
}
