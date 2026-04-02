import { Metadata } from "next";
import { redirect } from "next/navigation";

import { CollectionDetailPage } from "@/modules/collection/presentation/pages/collection-detail-page";
import { createClient } from "@/shared/infrastructure/supabase/server";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export const metadata: Metadata = {
  title: "Colección | Lumacraft",
  description: "Gestiona tus datos y esquema de colección.",
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch collection name for the title
  const { data: collection } = await supabase
    .from("collections")
    .select("name, display_name")
    .eq("id", id)
    .single();

  if (!collection) {
    redirect("/collections");
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-10 px-8 h-full">
      <CollectionDetailPage
        collectionId={id}
        collectionName={collection.display_name || collection.name}
      />
    </div>
  );
}
