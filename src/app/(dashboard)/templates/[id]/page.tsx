import { redirect } from "next/navigation";

import TemplateEditorPage from "@/modules/template/presentation/pages/template-editor-page";
import { createClient } from "@/shared/infrastructure/supabase/server";

export const metadata = {
  title: "Editor de Plantilla | Lumacraft",
  description: "Diseña tu documento con variables dinámicas.",
};

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: template } = await supabase
    .from("templates")
    .select("collection_id")
    .eq("id", id)
    .single();

  if (template?.collection_id) {
    redirect(`/collections/${template.collection_id}/templates/${id}`);
  }

  return <TemplateEditorPage templateId={id} />;
}
