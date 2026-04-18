"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/modules/auth/presentation/providers/auth-provider";
import { DomainError, fail, Result } from "@/shared/domain/result";
import { useSupabase } from "@/shared/presentation/providers/supabase-provider";

import { GetWorkspacesByUserUseCase } from "../../application/use-cases/get-workspaces-by-user.use-case";
import { WorkspaceUseCaseFactory } from "../../application/workspace-use-case.factory";
import { Workspace } from "../../domain/entities/workspace.entity";
import { IWorkspaceRepository } from "../../domain/ports/workspace-repository.port";
import { SupabaseWorkspaceRepository } from "../../infrastructure/repositories/supabase-workspace.repository";

const CURRENT_WORKSPACE_STORAGE_KEY = "lumacraft.currentWorkspaceId";

type WorkspaceContext = {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace) => void;
  createWorkspace: (name: string) => Promise<Result<Workspace>>;
  renameWorkspace: (workspaceId: string, name: string) => Promise<Result<Workspace>>;
  refreshWorkspaces: () => Promise<void>;
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
  const userId = user?.id ?? null;

  const repository = useMemo(
    () => workspaceRepository ?? new SupabaseWorkspaceRepository(supabase),
    [workspaceRepository, supabase],
  );
  const getWorkspacesUseCase = useMemo(
    () => new GetWorkspacesByUserUseCase(repository),
    [repository],
  );
  const factory = useMemo(() => WorkspaceUseCaseFactory.create(supabase), [supabase]);
  const createWorkspaceUseCase = useMemo(() => factory.createWorkspace(), [factory]);
  const updateWorkspaceUseCase = useMemo(() => factory.updateWorkspace(), [factory]);

  useEffect(() => {
    let active = true;

    const fetchWorkspaces = async (preferredWorkspaceId?: string) => {
      // Si la autenticación sigue cargando, mantenemos también nuestras banderas en true
      if (authLoading) {
        if (active) setLoading(true);
        return;
      }

      if (!userId) {
        if (active) {
          setWorkspaces([]);
          setCurrentWorkspace(null);
          setLoading(false);
        }
        return;
      }

      if (active) setLoading(true);

      const res = await getWorkspacesUseCase.execute(userId);
      if (!active) return;

      if (res.ok) {
        const persistedWorkspaceId =
          typeof window !== "undefined" && typeof window.localStorage?.getItem === "function"
            ? window.localStorage.getItem(CURRENT_WORKSPACE_STORAGE_KEY)
            : null;

        setWorkspaces(res.value);
        setCurrentWorkspace((current) =>
          preferredWorkspaceId
            ? (res.value.find((workspace) => workspace.id === preferredWorkspaceId) ??
              current ??
              res.value[0] ??
              null)
            : current && res.value.some((workspace) => workspace.id === current.id)
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
  }, [userId, authLoading, getWorkspacesUseCase]);

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

  const refreshWorkspaces = async () => {
    if (!userId) return;
    setLoading(true);
    const res = await getWorkspacesUseCase.execute(userId);
    if (res.ok) {
      const nextWorkspaces = res.value;
      setWorkspaces(nextWorkspaces);
      setCurrentWorkspace((current) =>
        current && nextWorkspaces.some((workspace) => workspace.id === current.id)
          ? current
          : (nextWorkspaces[0] ?? null),
      );
    }
    setLoading(false);
  };

  const createWorkspace = async (name: string): Promise<Result<Workspace>> => {
    if (!userId) {
      return fail(new DomainError("No authenticated user found", "UNAUTHORIZED"));
    }

    const result = await createWorkspaceUseCase.execute({
      name,
      ownerId: userId,
    });

    if (result.ok) {
      setWorkspaces((current) => [...current, result.value]);
      setCurrentWorkspace(result.value);
    }

    return result;
  };

  const renameWorkspace = async (workspaceId: string, name: string): Promise<Result<Workspace>> => {
    const result = await updateWorkspaceUseCase.execute({
      id: workspaceId,
      name,
    });

    if (result.ok) {
      setWorkspaces((current) =>
        current.map((workspace) => (workspace.id === workspaceId ? result.value : workspace)),
      );
      setCurrentWorkspace((current) => (current?.id === workspaceId ? result.value : current));
    }

    return result;
  };

  return (
    <Context.Provider
      value={{
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        createWorkspace,
        renameWorkspace,
        refreshWorkspaces,
        loading,
      }}
    >
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
