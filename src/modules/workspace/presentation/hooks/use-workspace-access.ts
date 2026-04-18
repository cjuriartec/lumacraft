"use client";

import { usePermissions } from "@/modules/authorization/presentation/providers/permission-provider";

export function useWorkspaceAccess() {
  const { isOwner, isSuperAdmin, loading } = usePermissions();
  const canAccessSettings = isOwner || isSuperAdmin;

  return {
    isOwner,
    isSuperAdmin,
    canAccessSettings,
    canManageWorkspace: canAccessSettings,
    canRenameWorkspace: isOwner,
    loading,
  };
}
