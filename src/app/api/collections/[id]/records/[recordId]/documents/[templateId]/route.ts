import { NextResponse } from "next/server";
import { z } from "zod";

import { GetRecordDocumentUseCase } from "@/modules/document/application/use-cases/get-record-document.use-case";
import { SaveRecordDocumentEditsUseCase } from "@/modules/document/application/use-cases/save-record-document-edits.use-case";
import {
  buildRecordDocumentPayload,
  resolveDocumentRouteContext,
} from "@/modules/document/infrastructure/document-server";
import { isTemplateBlocks, TemplateBlocks } from "@/modules/template/domain/types/template-blocks";
import { createClient } from "@/shared/infrastructure/supabase/server";

interface RouteParams {
  params: Promise<{
    id: string;
    recordId: string;
    templateId: string;
  }>;
}

const patchBodySchema = z.object({
  editedBlocks: z.custom<TemplateBlocks>((value) => isTemplateBlocks(value), {
    message: "Edited blocks payload is invalid",
  }),
  version: z.number().int().positive(),
});

function statusForError(code?: string) {
  if (code === "FORBIDDEN") return 403;
  if (code === "NOT_FOUND" || code === "DOCUMENT_NOT_FOUND") return 404;
  if (code === "DOCUMENT_VERSION_CONFLICT") return 409;
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

  const useCase = new GetRecordDocumentUseCase(contextResult.value.documentRepository);
  const documentResult = await useCase.execute({ templateId, recordId });

  if (!documentResult.ok) {
    return NextResponse.json(
      { error: { code: documentResult.error.code, message: documentResult.error.message } },
      { status: statusForError(documentResult.error.code) },
    );
  }

  if (!documentResult.value) {
    return NextResponse.json(
      { error: { code: "DOCUMENT_NOT_FOUND", message: "Record document not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: buildRecordDocumentPayload({
      collection: contextResult.value.collection,
      document: documentResult.value,
      permissions: contextResult.value.permissions,
      record: contextResult.value.record,
      template: contextResult.value.template,
    }),
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id: collectionId, recordId, templateId } = await params;
  const bodyResult = patchBodySchema.safeParse(await request.json().catch(() => null));
  if (!bodyResult.success) {
    return NextResponse.json(
      {
        error: {
          code: "DOCUMENT_INVALID_INPUT",
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

  if (!contextResult.value.permissions.canUpdate) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "You do not have permission to edit this document" } },
      { status: 403 },
    );
  }

  const useCase = new SaveRecordDocumentEditsUseCase(contextResult.value.documentRepository);
  const savedResult = await useCase.execute({
    templateId,
    recordId,
    editedBlocks: bodyResult.data.editedBlocks,
    expectedVersion: bodyResult.data.version,
    userId: user.id,
  });

  if (!savedResult.ok) {
    return NextResponse.json(
      { error: { code: savedResult.error.code, message: savedResult.error.message } },
      { status: statusForError(savedResult.error.code) },
    );
  }

  return NextResponse.json({
    data: buildRecordDocumentPayload({
      collection: contextResult.value.collection,
      document: savedResult.value,
      permissions: contextResult.value.permissions,
      record: contextResult.value.record,
      template: contextResult.value.template,
    }),
  });
}
