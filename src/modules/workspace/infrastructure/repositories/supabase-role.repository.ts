import { SupabaseClient } from "@supabase/supabase-js";

import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { BaseRepository } from "@/shared/infrastructure/base-repository";

import { Role } from "../../domain/entities/role.entity";
import { IRoleRepository } from "../../domain/ports/role-repository.port";

export class SupabaseRoleRepository extends BaseRepository implements IRoleRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, "roles");
  }

  async findAllByAccount(accountId: string): Promise<Result<Role[]>> {
    const { data, error } = await this.table
      .select("*")
      .eq("account_id", accountId)
      .order("name", { ascending: true });

    if (error) return fail(new DomainError(error.message, "DB_ERROR"));
    return ok(((data as Record<string, unknown>[]) || []).map((item) => this.toEntity(item)));
  }

  async findById(id: string): Promise<Result<Role | null>> {
    const { data, error } = await this.table.select("*").eq("id", id).maybeSingle();
    if (error) return fail(new DomainError(error.message, "DB_ERROR"));
    if (!data) return ok(null);
    return ok(this.toEntity(data));
  }

  async create(role: Role): Promise<Result<Role>> {
    const persistence = this.toPersistence(role);
    const { data, error } = await this.table.insert(persistence).select().single();
    if (error) return fail(new DomainError(error.message, "DB_ERROR"));
    return ok(this.toEntity(data));
  }

  async update(role: Role): Promise<Result<Role>> {
    const persistence = this.toPersistence(role);
    const { data, error } = await this.table
      .update(persistence)
      .eq("id", role.id)
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

  private toEntity(data: unknown): Role {
    const d = data as {
      id: string;
      account_id: string;
      name: string;
      description: string | null;
      is_superadmin: boolean;
      created_at: string;
    };

    const result = Role.create({
      id: d.id,
      accountId: d.account_id,
      name: d.name,
      description: d.description,
      isSuperadmin: d.is_superadmin,
      createdAt: new Date(d.created_at),
    });

    if (!result.ok) {
      throw new DomainError(
        `Failed to hydrate Role entity from database: ${result.error.message}`,
        "DATA_INTEGRITY_ERROR",
      );
    }

    return result.value;
  }

  private toPersistence(role: Role) {
    return {
      id: role.id,
      account_id: role.accountId,
      name: role.name,
      description: role.description,
      is_superadmin: role.isSuperadmin,
    };
  }
}
