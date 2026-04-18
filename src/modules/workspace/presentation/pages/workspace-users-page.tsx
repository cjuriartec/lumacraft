"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useBreadcrumbs } from "@/shared/presentation/providers/breadcrumb-provider";

import { MemberManager } from "../components/member-manager";
import { useWorkspaceAccess } from "../hooks/use-workspace-access";

export default function WorkspaceUsersPage() {
  const router = useRouter();
  const { canManageWorkspace, loading } = useWorkspaceAccess();

  useBreadcrumbs([
    { label: "Configuración", href: "/settings" },
    { label: "Workspace", href: "/settings/workspace/general" },
    { label: "Usuarios" },
  ]);

  useEffect(() => {
    if (!loading && !canManageWorkspace) {
      router.replace("/settings/workspace/general");
    }
  }, [canManageWorkspace, loading, router]);

  if (loading || !canManageWorkspace) {
    return <div className="h-32 animate-pulse rounded-3xl bg-surface/60" />;
  }

  return <MemberManager />;
}
