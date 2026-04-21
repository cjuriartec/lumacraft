import { Metadata } from "next";
import { redirect } from "next/navigation";

import { resolveRecordLabel } from "@/modules/collection/domain/services/record-label.service";
import { resolveDocumentRouteContext } from "@/modules/document/infrastructure/document-server";
import RecordDocumentEditorPage from "@/modules/document/presentation/pages/record-document-editor-page";
import { createClient } from "@/shared/infrastructure/supabase/server";

interface Params {
  params: Promise<{ id: string; recordId: string; templateId: string }>;
}

async function getRecordDocumentPageContext(
  collectionId: string,
  recordId: string,
  templateId: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { unauthorized: true as const };
  }

  const contextResult = await resolveDocumentRouteContext({
    collectionId,
    recordId,
    supabase,
    templateId,
    userId: user.id,
  });

  if (!contextResult.ok) {
    return {
      unauthorized: false as const,
      errorCode: contextResult.error.code,
    };
  }

  return {
    unauthorized: false as const,
    errorCode: null,
    context: contextResult.value,
  };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id, recordId, templateId } = await params;
  const pageContext = await getRecordDocumentPageContext(id, recordId, templateId);

  if (pageContext.unauthorized || !pageContext.context) {
    return {
      title: "Documento del Registro | Lumacraft",
      description: "Edita y descarga el documento persistido para un registro.",
    };
  }

  const label = resolveRecordLabel(
    {
      id: pageContext.context.record.id,
      data: pageContext.context.record.data,
    },
    pageContext.context.collection.primaryFieldName ?? null,
  );

  return {
    title: `${pageContext.context.template.name} - ${label} | Lumacraft`,
    description: "Edita y descarga el documento persistido para un registro.",
  };
}

export default async function RecordDocumentPage({ params }: Params) {
  const { id, recordId, templateId } = await params;
  const pageContext = await getRecordDocumentPageContext(id, recordId, templateId);

  if (pageContext.unauthorized) {
    redirect("/login");
  }

  if (!pageContext.context) {
    if (pageContext.errorCode === "WORKSPACE_COLLECTION_MISMATCH") {
      redirect("/collections");
    }

    redirect(`/collections/${id}`);
  }

  return (
    <RecordDocumentEditorPage
      collectionId={id}
      collectionAccountId={pageContext.context.collection.accountId}
      recordId={recordId}
      templateId={templateId}
    />
  );
}
