import { useEffect, useMemo, useState } from "react";

import { WorkspaceUseCaseFactory } from "@/modules/workspace/application/workspace-use-case.factory";
import { useWorkspace } from "@/modules/workspace/presentation/providers/workspace-provider";
import { useSupabase } from "@/shared/presentation/providers/supabase-provider";

export function useDashboardStats() {
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
    if (!currentWorkspace) return;

    const fetchStats = async () => {
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
