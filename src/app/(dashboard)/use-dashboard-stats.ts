import { useEffect, useMemo, useState } from "react";

import { usePermissions } from "@/modules/authorization/presentation/providers/permission-provider";
import { CollectionUseCaseFactory } from "@/modules/collection/application/collection-use-case.factory";
import { useCollections } from "@/modules/collection/presentation/hooks/use-collections";
import { useTemplates } from "@/modules/template/presentation/hooks/use-templates";
import { useWorkspace } from "@/modules/workspace/presentation/providers/workspace-provider";
import {
  buildCollectionIdSet,
  filterAccessibleCollections,
  filterTemplatesByAccessibleCollections,
} from "@/shared/lib/workspace-access";
import { useSupabase } from "@/shared/presentation/providers/supabase-provider";

export function useDashboardStats() {
  const { currentWorkspace } = useWorkspace();
  const { supabase } = useSupabase();
  const { collections, loading: loadingCollections } = useCollections();
  const { templates, loading: loadingTemplates } = useTemplates();
  const { can, isOwner, isSuperAdmin, loading: loadingPermissions } = usePermissions();
  const [stats, setStats] = useState({
    collectionsCount: 0,
    recordsCount: 0,
    templatesCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const factory = useMemo(() => CollectionUseCaseFactory.create(supabase), [supabase]);
  const listWorkspaceRecordsUseCase = useMemo(() => factory.listWorkspaceRecords(), [factory]);

  const accessibleCollections = useMemo(
    () => filterAccessibleCollections(collections, isOwner || isSuperAdmin, can),
    [can, collections, isOwner, isSuperAdmin],
  );
  const accessibleCollectionIds = useMemo(
    () => buildCollectionIdSet(accessibleCollections),
    [accessibleCollections],
  );
  const accessibleTemplates = useMemo(
    () => filterTemplatesByAccessibleCollections(templates, accessibleCollectionIds),
    [accessibleCollectionIds, templates],
  );

  useEffect(() => {
    let ignore = false;

    const fetchStats = async () => {
      if (!currentWorkspace) {
        if (!ignore) {
          setStats({
            collectionsCount: 0,
            recordsCount: 0,
            templatesCount: 0,
          });
          setLoading(false);
        }
        return;
      }

      if (loadingCollections || loadingTemplates || loadingPermissions) {
        if (!ignore) {
          setLoading(true);
        }
        return;
      }

      if (accessibleCollections.length === 0) {
        if (!ignore) {
          setStats({
            collectionsCount: 0,
            recordsCount: 0,
            templatesCount: 0,
          });
          setLoading(false);
        }
        return;
      }

      if (!ignore) {
        setLoading(true);
      }

      const result = await listWorkspaceRecordsUseCase.execute([...accessibleCollectionIds], {
        page: 1,
        pageSize: 1,
        sortField: "updated_at",
        sortDirection: "desc",
      });

      if (!ignore) {
        setStats({
          collectionsCount: accessibleCollections.length,
          recordsCount: result.ok ? result.value.total : 0,
          templatesCount: accessibleTemplates.length,
        });
        setLoading(false);
      }
    };

    void fetchStats();

    return () => {
      ignore = true;
    };
  }, [
    accessibleCollectionIds,
    accessibleCollections,
    accessibleTemplates,
    currentWorkspace,
    listWorkspaceRecordsUseCase,
    loadingCollections,
    loadingPermissions,
    loadingTemplates,
  ]);

  return { stats, loading };
}
