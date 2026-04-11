import RecordDocumentEditorPage from "@/modules/document/presentation/pages/record-document-editor-page";

export const metadata = {
  title: "Documento del Registro | Lumacraft",
  description: "Edita y descarga el documento persistido para un registro.",
};

export default async function RecordDocumentPage({
  params,
}: {
  params: Promise<{ id: string; recordId: string; templateId: string }>;
}) {
  const { id, recordId, templateId } = await params;

  return <RecordDocumentEditorPage collectionId={id} recordId={recordId} templateId={templateId} />;
}
