import TemplateListPage from "@/modules/template/presentation/pages/template-list-page";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Plantillas | Lumacraft",
  description: "Consulta las plantillas accesibles del workspace actual.",
};

export default function TemplatesPage() {
  return (
    <TemplateListPage
      canCreate={false}
      canUpdate={false}
      canDelete={false}
      enableCollectionFilter
      showCollectionShortcut
    />
  );
}
