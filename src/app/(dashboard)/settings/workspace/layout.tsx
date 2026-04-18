import { WorkspaceSettingsShell } from "@/modules/workspace/presentation/components/workspace-settings-shell";

export const dynamic = "force-dynamic";

export default function WorkspaceSettingsLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceSettingsShell>{children}</WorkspaceSettingsShell>;
}
