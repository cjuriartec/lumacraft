import { Metadata } from "next";
import { redirect } from "next/navigation";

import { resolveRecordLabel } from "@/modules/collection/domain/services/record-label.service";
import { RecordDetailPage } from "@/modules/collection/presentation/pages/record-detail-page";
import { createClient } from "@/shared/infrastructure/supabase/server";

interface Params {
  params: Promise<{
    id: string;
    recordId: string;
  }>;
}

async function getRecordPageContext(collectionId: string, recordId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { unauthorized: true as const };
  }

  const { data: collection } = await supabase
    .from("collections")
    .select("name, display_name, primary_field_name")
    .eq("id", collectionId)
    .single();

  if (!collection) {
    return { unauthorized: false as const, missingCollection: true as const };
  }

  const { data: record } = await supabase
    .from("records")
    .select("id, data")
    .eq("id", recordId)
    .eq("collection_id", collectionId)
    .single();

  if (!record) {
    return {
      unauthorized: false as const,
      missingCollection: false as const,
      missingRecord: true as const,
      collection,
    };
  }

  return {
    unauthorized: false as const,
    missingCollection: false as const,
    missingRecord: false as const,
    collection,
    record,
  };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id, recordId } = await params;
  const context = await getRecordPageContext(id, recordId);

  if (
    context.unauthorized ||
    context.missingCollection ||
    context.missingRecord ||
    !context.collection ||
    !context.record
  ) {
    return {
      title: "Registro | Lumacraft",
      description: "Vista de detalle del registro.",
    };
  }

  const label = resolveRecordLabel(
    {
      id: context.record.id,
      data: (context.record.data as Record<string, unknown>) || {},
    },
    context.collection.primary_field_name as string | null,
  );
  const collectionName =
    (context.collection.display_name as string | null) || (context.collection.name as string);

  return {
    title: `${label} | ${collectionName} | Lumacraft`,
    description: "Vista de detalle del registro.",
  };
}

export default async function Page({ params }: Params) {
  const { id, recordId } = await params;
  const context = await getRecordPageContext(id, recordId);

  if (context.unauthorized) {
    redirect("/login");
  }

  if (context.missingCollection || context.missingRecord || !context.collection) {
    redirect(`/collections/${id}`);
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-10 px-8 h-full">
      <RecordDetailPage
        collectionId={id}
        recordId={recordId}
        collectionName={
          ((context.collection.display_name as string | null) ||
            (context.collection.name as string)) as string
        }
      />
    </div>
  );
}
