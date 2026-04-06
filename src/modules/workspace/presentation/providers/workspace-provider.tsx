"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/modules/auth/presentation/providers/auth-provider";
import { useSupabase } from "@/shared/presentation/providers/supabase-provider";

import { GetWorkspacesByUserUseCase } from "../../application/use-cases/get-workspaces-by-user.use-case";
import { Workspace } from "../../domain/entities/workspace.entity";
import { IWorkspaceRepository } from "../../domain/ports/workspace-repository.port";
import { SupabaseWorkspaceRepository } from "../../infrastructure/repositories/supabase-workspace.repository";

const CURRENT_WORKSPACE_STORAGE_KEY = "lumacraft.currentWorkspaceId";

type WorkspaceContext = {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace) => void;
  loading: boolean;
};

const Context = createContext<WorkspaceContext | undefined>(undefined);

export default function WorkspaceProvider({
  children,
  workspaceRepository,
}: {
  children: React.ReactNode;
  workspaceRepository?: IWorkspaceRepository;
}) {
  const { user, loading: authLoading } = useAuth();
  const { supabase } = useSupabase();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const repository = useMemo(
    () => workspaceRepository ?? new SupabaseWorkspaceRepository(supabase),
    [workspaceRepository, supabase],
  );
  const getWorkspacesUseCase = useMemo(
    () => new GetWorkspacesByUserUseCase(repository),
    [repository],
  );

  useEffect(() => {
    let active = true;

    const fetchWorkspaces = async () => {
      // Si la autenticación sigue cargando, mantenemos también nuestras banderas en true
      if (authLoading) {
        if (active) setLoading(true);
        return;
      }

      if (!user) {
        if (active) {
          setWorkspaces([]);
          setCurrentWorkspace(null);
          setLoading(false);
        }
        return;
      }

      if (active) setLoading(true);

      const res = await getWorkspacesUseCase.execute(user.id);
      if (!active) return;

      if (res.ok) {
        const persistedWorkspaceId =
          typeof window !== "undefined" && typeof window.localStorage?.getItem === "function"
            ? window.localStorage.getItem(CURRENT_WORKSPACE_STORAGE_KEY)
            : null;

        setWorkspaces(res.value);
        setCurrentWorkspace((current) =>
          current && res.value.some((workspace) => workspace.id === current.id)
            ? current
            : persistedWorkspaceId
              ? (res.value.find((workspace) => workspace.id === persistedWorkspaceId) ??
                res.value[0] ??
                null)
              : (res.value[0] ?? null),
        );
      }
      setLoading(false);
    };

    fetchWorkspaces();
    return () => {
      active = false;
    };
  }, [user, authLoading, getWorkspacesUseCase]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storage = window.localStorage as Storage | undefined;

    if (currentWorkspace?.id && typeof storage?.setItem === "function") {
      storage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, currentWorkspace.id);
    } else if (
      storage &&
      workspaces.length === 0 &&
      !loading &&
      typeof storage?.removeItem === "function"
    ) {
      storage.removeItem(CURRENT_WORKSPACE_STORAGE_KEY);
    }
  }, [currentWorkspace, workspaces.length, loading]);

  return (
    <Context.Provider value={{ workspaces, currentWorkspace, setCurrentWorkspace, loading }}>
      {children}
    </Context.Provider>
  );
}

export const useWorkspace = () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }
  return context;
};
