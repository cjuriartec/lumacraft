import TemplateEditorPage from "@/modules/template/presentation/pages/template-editor-page";

export const metadata = {
  title: "Editor de Plantilla | Lumacraft",
  description: "Diseña tu documento con variables dinámicas.",
};

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TemplateEditorPage templateId={id} />;
}
