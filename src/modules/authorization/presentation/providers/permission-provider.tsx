"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/modules/auth/presentation/providers/auth-provider";
import { useWorkspace } from "@/modules/workspace/presentation/providers/workspace-provider";
import { useSupabase } from "@/shared/presentation/providers/supabase-provider";

import { AuthzUseCaseFactory } from "../../application/authz-use-case.factory";
import type { CollectionPermissionMap } from "../../application/use-cases/get-user-permissions.use-case";

interface PermissionContextValue {
  /** Check if user can perform an action on a collection */
  can: (collectionId: string, action: "read" | "create" | "update" | "delete") => boolean;
  /** Whether the current user is the workspace owner */
  isOwner: boolean;
  /** Whether the current user has a superadmin role */
  isSuperAdmin: boolean;
  /** Loading state */
  loading: boolean;
  /** Force refresh permissions */
  refresh: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextValue>({
  can: () => true,
  isOwner: false,
  isSuperAdmin: false,
  loading: true,
  refresh: async () => {},
});

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { supabase } = useSupabase();
  const { user, loading: authLoading } = useAuth();
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();

  const [isOwner, setIsOwner] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState<Map<string, CollectionPermissionMap>>(new Map());
  const [loading, setLoading] = useState(true);
  const userId = user?.id;
  const workspaceId = currentWorkspace?.id;

  const useCase = useMemo(
    () => AuthzUseCaseFactory.create(supabase).getUserPermissions(),
    [supabase],
  );

  const fetchPermissions = useCallback(async () => {
    // Si todavía estamos intentando determinar el usuario o el workspace,
    // mantenemos el estado de carga y no tomamos decisiones de acceso prematuras.
    if (authLoading || workspaceLoading) {
      setLoading(true);
      return;
    }

    if (!userId || !workspaceId) {
      setIsOwner(false);
      setIsSuperAdmin(false);
      setPermissions(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await useCase.execute(userId, workspaceId);

    if (result.ok) {
      setIsOwner(result.value.isOwner);
      setIsSuperAdmin(result.value.isSuperAdmin);
      setPermissions(result.value.permissions);
    }
    setLoading(false);
  }, [userId, workspaceId, authLoading, workspaceLoading, useCase]);

  useEffect(() => {
    let isMounted = true;

    if (isMounted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchPermissions();
    }

    return () => {
      isMounted = false;
    };
  }, [fetchPermissions]);

  const can = useCallback(
    (collectionId: string, action: "read" | "create" | "update" | "delete"): boolean => {
      // Owner and superadmin bypass all permission checks
      if (isOwner || isSuperAdmin) return true;

      const perm = permissions.get(collectionId);
      if (!perm) return false; // No explicit permission = no access

      switch (action) {
        case "read":
          return perm.canRead;
        case "create":
          return perm.canCreate;
        case "update":
          return perm.canUpdate;
        case "delete":
          return perm.canDelete;
        default:
          return false;
      }
    },
    [isOwner, isSuperAdmin, permissions],
  );

  return (
    <PermissionContext.Provider
      value={{ can, isOwner, isSuperAdmin, loading, refresh: fetchPermissions }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionContext);
}
