"use client";

import { useEffect, useMemo, useState } from "react";

import { useSupabase } from "@/shared/presentation/providers/supabase-provider";

import { WorkspaceUseCaseFactory } from "../../application/workspace-use-case.factory";
import { useWorkspace } from "../providers/workspace-provider";

export function useWorkspaceStats() {
  const { currentWorkspace } = useWorkspace();
  const { supabase } = useSupabase();
  const [stats, setStats] = useState({
    collectionsCount: 0,
    recordsCount: 0,
    templatesCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const factory = useMemo(() => WorkspaceUseCaseFactory.create(supabase), [supabase]);
  const statsUseCase = useMemo(() => factory.getWorkspaceStats(), [factory]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentWorkspace) {
        setStats({
          collectionsCount: 0,
          recordsCount: 0,
          templatesCount: 0,
        });
        setLoading(false);
        return;
      }

      setLoading(true);
      const res = await statsUseCase.execute(currentWorkspace.id);

      if (res.ok) {
        setStats(res.value);
      }
      setLoading(false);
    };

    void fetchStats();
  }, [currentWorkspace, statsUseCase]);

  return { stats, loading };
}
