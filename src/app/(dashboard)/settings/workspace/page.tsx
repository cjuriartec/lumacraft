import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function WorkspaceSettingsIndexPage() {
  redirect("/settings/workspace/general");
}
