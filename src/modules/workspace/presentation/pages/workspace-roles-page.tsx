"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PermissionManager } from "@/modules/authorization/presentation/components/permission-manager";
import { useBreadcrumbs } from "@/shared/presentation/providers/breadcrumb-provider";

import { RoleManager } from "../components/role-manager";
import { useRoles } from "../hooks/use-roles";
import { useWorkspaceAccess } from "../hooks/use-workspace-access";
import { useWorkspace } from "../providers/workspace-provider";

export default function WorkspaceRolesPage() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const { canManageWorkspace, loading: loadingAccess } = useWorkspaceAccess();
  const { roles, loading, createRole, updateRole, deleteRole } = useRoles(currentWorkspace?.id);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  useBreadcrumbs([
    { label: "Configuración", href: "/settings" },
    { label: "Workspace", href: "/settings/workspace/general" },
    { label: "Roles" },
  ]);

  useEffect(() => {
    if (!loadingAccess && !canManageWorkspace) {
      router.replace("/settings/workspace/general");
    }
  }, [canManageWorkspace, loadingAccess, router]);

  useEffect(() => {
    const syncSelectedRole = () => {
      if (roles.length === 0) {
        if (selectedRoleId !== null) {
          setSelectedRoleId(null);
        }
        return;
      }

      const roleExists = roles.some((role) => role.id === selectedRoleId);
      if (!selectedRoleId || !roleExists) {
        setSelectedRoleId(roles[0].id);
      }
    };

    void Promise.resolve().then(syncSelectedRole);
  }, [roles, selectedRoleId]);

  if (loadingAccess || !canManageWorkspace) {
    return <div className="h-32 animate-pulse rounded-3xl bg-surface/60" />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
      <RoleManager
        roles={roles}
        loading={loading}
        createRole={createRole}
        updateRole={updateRole}
        deleteRole={deleteRole}
        selectedRoleId={selectedRoleId}
        onSelectRole={setSelectedRoleId}
      />
      <PermissionManager roles={roles} selectedRoleId={selectedRoleId} />
    </div>
  );
}
