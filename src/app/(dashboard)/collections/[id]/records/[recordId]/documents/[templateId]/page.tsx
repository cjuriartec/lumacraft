import { Metadata } from "next";

import { resolveRecordLabel } from "@/modules/collection/domain/services/record-label.service";
import RecordDocumentEditorPage from "@/modules/document/presentation/pages/record-document-editor-page";
import { createClient } from "@/shared/infrastructure/supabase/server";

interface Params {
  params: Promise<{ id: string; recordId: string; templateId: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id, recordId, templateId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      title: "Documento del Registro | Lumacraft",
      description: "Edita y descarga el documento persistido para un registro.",
    };
  }

  const [{ data: collection }, { data: record }, { data: template }] = await Promise.all([
    supabase
      .from("collections")
      .select("name, display_name, primary_field_name")
      .eq("id", id)
      .single(),
    supabase.from("records").select("id, data").eq("id", recordId).eq("collection_id", id).single(),
    supabase.from("templates").select("name").eq("id", templateId).single(),
  ]);

  if (!collection || !record || !template) {
    return {
      title: "Documento del Registro | Lumacraft",
      description: "Edita y descarga el documento persistido para un registro.",
    };
  }

  const label = resolveRecordLabel(
    {
      id: record.id,
      data: (record.data as Record<string, unknown>) || {},
    },
    collection.primary_field_name as string | null,
  );

  return {
    title: `${template.name} - ${label} | Lumacraft`,
    description: "Edita y descarga el documento persistido para un registro.",
  };
}

export default async function RecordDocumentPage({ params }: Params) {
  const { id, recordId, templateId } = await params;

  return <RecordDocumentEditorPage collectionId={id} recordId={recordId} templateId={templateId} />;
}
