import { SupabaseClient } from "@supabase/supabase-js";

import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { BaseRepository } from "@/shared/infrastructure/base-repository";

import { Workspace } from "../../domain/entities/workspace.entity";
import { IWorkspaceRepository } from "../../domain/ports/workspace-repository.port";

export class SupabaseWorkspaceRepository extends BaseRepository implements IWorkspaceRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, "accounts");
  }

  public async findById(id: string): Promise<Result<Workspace | null>> {
    const { data, error } = await this.table.select("*").eq("id", id).single();

    if (error) {
      if (error.code === "PGRST116") return ok(null);
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    return ok(this.toEntity(data));
  }

  public async findByUserId(userId: string): Promise<Result<Workspace[]>> {
    const { data: owned, error: ownedError } = await this.table.select("*").eq("owner_id", userId);
    if (ownedError) {
      return fail(new DomainError(ownedError.message, "DB_ERROR"));
    }

    const { data: memberships, error: membershipError } = await this.supabase
      .from("account_members")
      .select("account_id")
      .eq("user_id", userId);

    if (membershipError) {
      return fail(new DomainError(membershipError.message, "DB_ERROR"));
    }

    const accountIds = [...new Set((memberships ?? []).map((row) => row.account_id as string))];
    let memberWorkspaces: Record<string, unknown>[] = [];

    if (accountIds.length > 0) {
      const { data: memberData, error: memberError } = await this.table
        .select("*")
        .in("id", accountIds);
      if (memberError) {
        return fail(new DomainError(memberError.message, "DB_ERROR"));
      }
      memberWorkspaces = (memberData as Record<string, unknown>[]) ?? [];
    }

    const merged = [...(owned as Record<string, unknown>[]), ...memberWorkspaces];
    const uniqueById = new Map<string, Record<string, unknown>>();

    for (const item of merged) {
      uniqueById.set(item.id as string, item);
    }

    return ok([...uniqueById.values()].map((item) => this.toEntity(item)));
  }

  public async create(workspace: Workspace): Promise<Result<Workspace>> {
    const { data, error } = await this.table
      .insert({
        id: workspace.id,
        name: workspace.name,
        owner_id: workspace.ownerId,
        created_at: workspace.createdAt,
        updated_at: workspace.updatedAt,
      })
      .select()
      .single();

    if (error) {
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    return ok(this.toEntity(data));
  }

  private toEntity(data: Record<string, unknown>): Workspace {
    const result = Workspace.create({
      id: data.id as string,
      name: data.name as string,
      ownerId: data.owner_id as string,
      settings: data.settings as Record<string, unknown> | undefined,
      isActive: data.is_active as boolean,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    });

    if (!result.ok) {
      throw new DomainError(
        `Failed to hydrate Workspace entity from database: ${result.error.message}`,
        "DATA_INTEGRITY_ERROR",
      );
    }

    return result.value;
  }
}
