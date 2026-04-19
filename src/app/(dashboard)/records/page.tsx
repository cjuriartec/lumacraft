import WorkspaceRecordsPage from "@/modules/collection/presentation/pages/workspace-records-page";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Registros | Lumacraft",
  description: "Consulta los registros accesibles del workspace actual.",
};

export default function RecordsPage() {
  return <WorkspaceRecordsPage />;
}
