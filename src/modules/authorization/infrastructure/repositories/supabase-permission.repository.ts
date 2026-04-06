import { SupabaseClient } from "@supabase/supabase-js";

import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { BaseRepository } from "@/shared/infrastructure/base-repository";

import { CollectionPermission } from "../../domain/entities/permission.entity";
import { IPermissionRepository } from "../../domain/ports/permission-repository.port";

export class SupabasePermissionRepository extends BaseRepository implements IPermissionRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, "collection_permissions");
  }

  async findByRoleAndCollection(
    roleId: string,
    collectionId: string,
  ): Promise<Result<CollectionPermission | null>> {
    const { data, error } = await this.table
      .select("*")
      .eq("role_id", roleId)
      .eq("collection_id", collectionId)
      .maybeSingle();

    if (error) return fail(new DomainError(error.message, "DB_ERROR"));
    if (!data) return ok(null);

    return ok(this.toEntity(data));
  }

  async findByRoleId(roleId: string): Promise<Result<CollectionPermission[]>> {
    const { data, error } = await this.table.select("*").eq("role_id", roleId);

    if (error) return fail(new DomainError(error.message, "DB_ERROR"));
    return ok((data || []).map((item: Record<string, unknown>) => this.toEntity(item)));
  }

  async findByCollectionId(collectionId: string): Promise<Result<CollectionPermission[]>> {
    const { data, error } = await this.table.select("*").eq("collection_id", collectionId);

    if (error) return fail(new DomainError(error.message, "DB_ERROR"));
    return ok((data || []).map((item: Record<string, unknown>) => this.toEntity(item)));
  }

  async findByAccountId(accountId: string): Promise<Result<CollectionPermission[]>> {
    // Join through roles to get all permissions for an account
    const { data: roles, error: rolesError } = await this.supabase
      .from("roles")
      .select("id")
      .eq("account_id", accountId);

    if (rolesError) return fail(new DomainError(rolesError.message, "DB_ERROR"));
    if (!roles || roles.length === 0) return ok([]);

    const roleIds = roles.map((r: { id: string }) => r.id);

    const { data, error } = await this.table.select("*").in("role_id", roleIds);

    if (error) return fail(new DomainError(error.message, "DB_ERROR"));
    return ok((data || []).map((item: Record<string, unknown>) => this.toEntity(item)));
  }

  async upsert(permission: CollectionPermission): Promise<Result<CollectionPermission>> {
    const persistence = this.toPersistence(permission);
    const { data, error } = await this.table
      .upsert(persistence, { onConflict: "role_id,collection_id" })
      .select()
      .single();

    if (error) return fail(new DomainError(error.message, "DB_ERROR"));
    return ok(this.toEntity(data));
  }

  async delete(id: string): Promise<Result<void>> {
    const { error } = await this.table.delete().eq("id", id);
    if (error) return fail(new DomainError(error.message, "DB_ERROR"));
    return ok(undefined);
  }

  private toEntity(data: Record<string, unknown>): CollectionPermission {
    return new CollectionPermission({
      id: data.id as string,
      roleId: data.role_id as string,
      collectionId: data.collection_id as string,
      canRead: data.can_read as boolean,
      canCreate: data.can_create as boolean,
      canUpdate: data.can_update as boolean,
      canDelete: data.can_delete as boolean,
    });
  }

  private toPersistence(permission: CollectionPermission) {
    const json = permission.toJSON();
    return {
      id: json.id,
      role_id: json.roleId,
      collection_id: json.collectionId,
      can_read: json.canRead,
      can_create: json.canCreate,
      can_update: json.canUpdate,
      can_delete: json.canDelete,
    };
  }
}
