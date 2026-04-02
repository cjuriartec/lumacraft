import { SupabaseClient } from "@supabase/supabase-js";

import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { BaseRepository } from "@/shared/infrastructure/base-repository";

import { WorkspaceMember } from "../../domain/entities/workspace-member.entity";
import { IWorkspaceMemberRepository } from "../../domain/ports/workspace-member-repository.port";

export class SupabaseWorkspaceMemberRepository
  extends BaseRepository
  implements IWorkspaceMemberRepository
{
  constructor(supabase: SupabaseClient) {
    super(supabase, "account_members");
  }

  async findByWorkspaceId(workspaceId: string): Promise<Result<WorkspaceMember[]>> {
    const { data, error } = await this.supabase
      .from("workspace_members_view")
      .select("*")
      .eq("account_id", workspaceId);

    if (error) return fail(new DomainError(error.message, "DB_ERROR"));
    return ok(((data as unknown[]) || []).map((d) => this.toEntity(d)));
  }

  async findById(id: string): Promise<Result<WorkspaceMember | null>> {
    const { data, error } = await this.supabase
      .from("workspace_members_view")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return ok(null);
      return fail(new DomainError(error.message, "DB_ERROR"));
    }
    return ok(this.toEntity(data));
  }

  async findByUserAndWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<Result<WorkspaceMember | null>> {
    const { data, error } = await this.supabase
      .from("workspace_members_view")
      .select("*")
      .eq("user_id", userId)
      .eq("account_id", workspaceId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return ok(null);
      return fail(new DomainError(error.message, "DB_ERROR"));
    }
    return ok(this.toEntity(data));
  }

  async addMember(member: WorkspaceMember): Promise<Result<WorkspaceMember>> {
    const persistence = {
      id: member.id,
      account_id: member.workspaceId,
      user_id: member.userId,
      role_id: member.roleId,
    };
    // Mutation still goes to the base table
    const { data, error } = await this.table.insert(persistence).select().single();
    if (error) return fail(new DomainError(error.message, "DB_ERROR"));

    // Fetch the enriched version for the result
    return this.findById(data.id) as Promise<Result<WorkspaceMember>>;
  }

  async updateMemberRole(memberId: string, roleId: string): Promise<Result<WorkspaceMember>> {
    const { error } = await this.table.update({ role_id: roleId }).eq("id", memberId);

    if (error) return fail(new DomainError(error.message, "DB_ERROR"));

    // Fetch the enriched version for the result
    return this.findById(memberId) as Promise<Result<WorkspaceMember>>;
  }

  async removeMember(memberId: string): Promise<Result<void>> {
    const { error } = await this.table.delete().eq("id", memberId);
    if (error) return fail(new DomainError(error.message, "DB_ERROR"));
    return ok(undefined);
  }

  async findUserIdByEmail(email: string): Promise<Result<string | null>> {
    const { data, error } = await this.supabase.rpc("resolve_user_by_email", {
      lookup_email: email,
    });

    if (error) return fail(new DomainError(error.message, "DB_ERROR"));
    return ok(data as string | null);
  }

  private toEntity(data: unknown): WorkspaceMember {
    const d = data as {
      id: string;
      account_id: string;
      user_id: string;
      role_id: string;
      user_name?: string;
      user_email?: string;
      user_avatar_url?: string;
      joined_at: string;
    };

    const result = WorkspaceMember.create({
      id: d.id,
      workspaceId: d.account_id,
      userId: d.user_id,
      roleId: d.role_id,
      userName: d.user_name,
      userEmail: d.user_email,
      userAvatarUrl: d.user_avatar_url,
      joinedAt: new Date(d.joined_at),
    });

    if (!result.ok) {
      throw new DomainError(
        `Failed to hydrate WorkspaceMember entity from database: ${result.error.message}`,
        "DATA_INTEGRITY_ERROR",
      );
    }

    return result.value;
  }
}
