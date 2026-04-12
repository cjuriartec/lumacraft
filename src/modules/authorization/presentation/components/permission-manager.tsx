"use client";

import { Loader2, ShieldAlert } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useCollections } from "@/modules/collection/presentation/hooks/use-collections";
import { useGuidance } from "@/modules/guidance/presentation/hooks/use-guidance";
import { useWorkspace } from "@/modules/workspace/presentation/providers/workspace-provider";
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
import { usePermissions } from "../providers/permission-provider";

type Role = {
  id: string;
  name: string;
  is_superadmin: boolean;
};

export function PermissionManager() {
  const { supabase } = useSupabase();
  const { currentWorkspace } = useWorkspace();
  const { collections, loading: collectionsLoading } = useCollections();
  const { isOwner, isSuperAdmin } = usePermissions();
  const { trackMilestone } = useGuidance();

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<CollectionPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const repository = useMemo(() => new SupabasePermissionRepository(supabase), [supabase]);
  const manageUseCase = useMemo(() => new ManagePermissionsUseCase(repository), [repository]);

  const loadData = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    setLoading(true);

    try {
      // Load Roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("roles")
        .select("id, name, is_superadmin")
        .eq("account_id", currentWorkspace.id)
        .order("name");

      if (rolesError) throw rolesError;
      setRoles(rolesData || []);

      // Load Permissions
      const permResult = await repository.findByAccountId(currentWorkspace.id);
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
  }, [currentWorkspace?.id, supabase, repository]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!isOwner && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-surface border border-border/10 rounded-2xl">
        <ShieldAlert size={48} className="text-red-500/50 mb-4" />
        <h3 className="text-xl font-bold mb-2">Acceso Denegado</h3>
        <p className="text-muted-foreground text-sm max-w-sm">
          No tienes permisos para acceder a la gestión de roles y accesos. Solo los propietarios y
          administradores pueden ver esta sección.
        </p>
      </div>
    );
  }

  if (loading || collectionsLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
      (p) => p.roleId === roleId && p.collectionId === collectionId,
    );

    // Default values if no permission exists yet
    // Notice: if we add Create/Update/Delete but there is no explicit Read, we should auto-grant Read
    let canRead = existing?.canRead ?? false;
    let canCreate = existing?.canCreate ?? false;
    let canUpdate = existing?.canUpdate ?? false;
    let canDelete = existing?.canDelete ?? false;

    switch (action) {
      case "canRead":
        canRead = !currentValue;
        // Auto-deny others if turning off read
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
      id: existing?.id, // If it exists, update it. If not, the useCase will generate a new id
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
        const index = next.findIndex((p) => p.roleId === roleId && p.collectionId === collectionId);
        if (index > -1) {
          next[index] = res.value;
        } else {
          next.push(res.value);
        }
        return next;
      });
    } else {
      console.error(res.error);
      // Ideally show a toast
    }
  };

  return (
    <div className="space-y-12">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg mb-4">
          {error}
        </div>
      )}
      {roles
        .filter((r) => !r.is_superadmin)
        .map((role) => (
          <div
            key={role.id}
            data-guidance-anchor="permissions-matrix"
            className="bg-surface border border-border/5 rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-border/10 bg-surface-hover/30">
              <h3 className="font-semibold text-foreground text-lg">{role.name}</h3>
              <p className="text-xs text-muted-foreground">Permisos granulares por colección</p>
            </div>

            <div className="p-0">
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
                    const perm = permissions.find(
                      (p) => p.roleId === role.id && p.collectionId === collection.id,
                    );
                    const canRead = perm?.canRead ?? false;
                    const canCreate = perm?.canCreate ?? false;
                    const canUpdate = perm?.canUpdate ?? false;
                    const canDelete = perm?.canDelete ?? false;

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
                              handleToggle(role.id, collection.id, "canRead", canRead)
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            data-guidance-anchor="permission-switch"
                            checked={canCreate}
                            onCheckedChange={() =>
                              handleToggle(role.id, collection.id, "canCreate", canCreate)
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            data-guidance-anchor="permission-switch"
                            checked={canUpdate}
                            onCheckedChange={() =>
                              handleToggle(role.id, collection.id, "canUpdate", canUpdate)
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            data-guidance-anchor="permission-switch"
                            checked={canDelete}
                            onCheckedChange={() =>
                              handleToggle(role.id, collection.id, "canDelete", canDelete)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {collections.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground text-sm"
                      >
                        No hay colecciones creadas en este workspace.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
      {roles.filter((r) => !r.is_superadmin).length === 0 && (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border/20 rounded-2xl bg-surface/50">
          No hay roles personalizados configurados.
        </div>
      )}
    </div>
  );
}
