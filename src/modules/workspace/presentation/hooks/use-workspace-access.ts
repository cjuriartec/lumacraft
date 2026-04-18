"use client";

import { usePermissions } from "@/modules/authorization/presentation/providers/permission-provider";

export function useWorkspaceAccess() {
  const { isOwner, isSuperAdmin, loading } = usePermissions();

  return {
    isOwner,
    isSuperAdmin,
    canManageWorkspace: isOwner || isSuperAdmin,
    canRenameWorkspace: isOwner,
    loading,
  };
}
