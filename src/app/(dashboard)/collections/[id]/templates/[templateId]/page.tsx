import TemplateEditorPage from "@/modules/template/presentation/pages/template-editor-page";

export const metadata = {
  title: "Editor de Plantilla | Lumacraft",
  description: "Diseña una plantilla vinculada a tu colección.",
};

export default async function CollectionTemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string; templateId: string }>;
}) {
  const { templateId } = await params;
  return <TemplateEditorPage templateId={templateId} />;
}
