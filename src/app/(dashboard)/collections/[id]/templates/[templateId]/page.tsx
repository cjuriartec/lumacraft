import { redirect } from "next/navigation";

import TemplateEditorPage from "@/modules/template/presentation/pages/template-editor-page";
import { createClient } from "@/shared/infrastructure/supabase/server";
import { matchesCurrentWorkspaceSelection } from "@/shared/lib/current-workspace-selection.server";

export const metadata = {
  title: "Editor de Plantilla | Lumacraft",
  description: "Diseña una plantilla vinculada a tu colección.",
};

export default async function CollectionTemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string; templateId: string }>;
}) {
  const { id, templateId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: collection } = await supabase
    .from("collections")
    .select("account_id")
    .eq("id", id)
    .maybeSingle();

  if (!collection || !(await matchesCurrentWorkspaceSelection(collection.account_id))) {
    redirect("/collections");
  }

  const { data: template } = await supabase
    .from("templates")
    .select("collection_id")
    .eq("id", templateId)
    .maybeSingle();

  if (!template || template.collection_id !== id) {
    redirect(`/collections/${id}?tab=templates`);
  }

  return <TemplateEditorPage templateId={templateId} collectionAccountId={collection.account_id} />;
}
