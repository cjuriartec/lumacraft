"use client";

import { Loader2, ShieldAlert } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useCollections } from "@/modules/collection/presentation/hooks/use-collections";
import { useGuidance } from "@/modules/guidance/presentation/hooks/use-guidance";
import { Role } from "@/modules/workspace/domain/entities/role.entity";
import { useWorkspaceAccess } from "@/modules/workspace/presentation/hooks/use-workspace-access";
import { Switch } from "@/shared/presentation/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/presentation/components/ui/table";
import { useSupabase } from "@/shared/presentation/providers/supabase-provider";

import { ManagePermissionsUseCase } from "../../application/use-cases/manage-permissions.use-case";
import { CollectionPermission } from "../../domain/entities/permission.entity";
import { SupabasePermissionRepository } from "../../infrastructure/repositories/supabase-permission.repository";

interface PermissionManagerProps {
  roles: Role[];
  selectedRoleId: string | null;
}

export function PermissionManager({ roles, selectedRoleId }: PermissionManagerProps) {
  const { supabase } = useSupabase();
  const { collections, loading: collectionsLoading } = useCollections();
  const { canManageWorkspace } = useWorkspaceAccess();
  const { trackMilestone } = useGuidance();

  const [permissions, setPermissions] = useState<CollectionPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const repository = useMemo(() => new SupabasePermissionRepository(supabase), [supabase]);
  const manageUseCase = useMemo(() => new ManagePermissionsUseCase(repository), [repository]);
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null;

  const loadData = useCallback(async () => {
    if (!selectedRoleId) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const permResult = await repository.findByRoleId(selectedRoleId);
      if (permResult.ok) {
        setPermissions(permResult.value);
      } else {
        throw new Error(permResult.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [repository, selectedRoleId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (!canManageWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border/10 bg-surface p-12 text-center">
        <ShieldAlert size={48} className="mb-4 text-red-500/50" />
        <h3 className="mb-2 text-xl font-bold">Acceso denegado</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Solo los propietarios y administradores pueden editar permisos del workspace.
        </p>
      </div>
    );
  }

  if (!selectedRole) {
    return (
      <div className="rounded-3xl border border-dashed border-border/30 bg-surface/60 p-10 text-center text-sm text-foreground/65">
        Selecciona un rol para editar sus permisos por colección.
      </div>
    );
  }

  if (loading || collectionsLoading) {
    return (
      <div className="flex justify-center rounded-3xl border border-border/40 bg-surface p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleToggle = async (
    roleId: string,
    collectionId: string,
    action: "canRead" | "canCreate" | "canUpdate" | "canDelete",
    currentValue: boolean,
  ) => {
    const existing = permissions.find(
      (permission) => permission.roleId === roleId && permission.collectionId === collectionId,
    );

    let canRead = existing?.canRead ?? false;
    let canCreate = existing?.canCreate ?? false;
    let canUpdate = existing?.canUpdate ?? false;
    let canDelete = existing?.canDelete ?? false;

    switch (action) {
      case "canRead":
        canRead = !currentValue;
        if (!canRead) {
          canCreate = false;
          canUpdate = false;
          canDelete = false;
        }
        break;
      case "canCreate":
        canCreate = !currentValue;
        if (canCreate) canRead = true;
        break;
      case "canUpdate":
        canUpdate = !currentValue;
        if (canUpdate) canRead = true;
        break;
      case "canDelete":
        canDelete = !currentValue;
        if (canDelete) canRead = true;
        break;
    }

    const res = await manageUseCase.upsert({
      id: existing?.id,
      roleId,
      collectionId,
      canRead,
      canCreate,
      canUpdate,
      canDelete,
    });

    if (res.ok) {
      void trackMilestone("permission_updated");
      setPermissions((prev) => {
        const next = [...prev];
        const index = next.findIndex(
          (permission) => permission.roleId === roleId && permission.collectionId === collectionId,
        );
        if (index > -1) {
          next[index] = res.value;
        } else {
          next.push(res.value);
        }
        return next;
      });
    } else {
      setError(res.error.message);
    }
  };

  if (selectedRole.isSuperadmin) {
    return (
      <div className="rounded-3xl border border-border/40 bg-surface p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
          Permisos del rol
        </p>
        <h3 className="mt-4 text-xl font-semibold text-foreground">{selectedRole.name}</h3>
        <p className="mt-3 text-sm leading-6 text-foreground/70">
          El rol administrador tiene acceso total al workspace y no depende de permisos granulares
          por colección.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-3xl border border-border/40 bg-surface p-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
          Permisos por colección
        </p>
        <h3 className="mt-4 text-xl font-semibold text-foreground">{selectedRole.name}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Estas reglas aplican únicamente a este rol dentro del workspace actual.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
          {error}
        </div>
      ) : null}

      <div
        data-guidance-anchor="permissions-matrix"
        className="overflow-hidden rounded-2xl border border-border/10"
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[300px]">Colección</TableHead>
              <TableHead className="text-center">Leer</TableHead>
              <TableHead className="text-center">Crear</TableHead>
              <TableHead className="text-center">Actualizar</TableHead>
              <TableHead className="text-center">Eliminar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collections.map((collection) => {
              const permission = permissions.find(
                (item) => item.collectionId === collection.id && item.roleId === selectedRole.id,
              );
              const canRead = permission?.canRead ?? false;
              const canCreate = permission?.canCreate ?? false;
              const canUpdate = permission?.canUpdate ?? false;
              const canDelete = permission?.canDelete ?? false;

              return (
                <TableRow key={collection.id}>
                  <TableCell className="font-medium">
                    {collection.displayName || collection.name}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      data-guidance-anchor="permission-switch"
                      checked={canRead}
                      onCheckedChange={() =>
                        handleToggle(selectedRole.id, collection.id, "canRead", canRead)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      data-guidance-anchor="permission-switch"
                      checked={canCreate}
                      onCheckedChange={() =>
                        handleToggle(selectedRole.id, collection.id, "canCreate", canCreate)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      data-guidance-anchor="permission-switch"
                      checked={canUpdate}
                      onCheckedChange={() =>
                        handleToggle(selectedRole.id, collection.id, "canUpdate", canUpdate)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      data-guidance-anchor="permission-switch"
                      checked={canDelete}
                      onCheckedChange={() =>
                        handleToggle(selectedRole.id, collection.id, "canDelete", canDelete)
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {collections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                  No hay colecciones creadas en este workspace.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
