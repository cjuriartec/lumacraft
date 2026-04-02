import { SupabaseClient } from '@supabase/supabase-js'
import { Result, ok, fail, DomainError } from '@/shared/domain/result'
import { IWorkspaceMemberRepository } from '../../domain/ports/workspace-member-repository.port'
import { WorkspaceMember } from '../../domain/entities/workspace-member.entity'
import { BaseRepository } from '@/shared/infrastructure/base-repository'

export class SupabaseWorkspaceMemberRepository extends BaseRepository implements IWorkspaceMemberRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'account_members')
  }

  async findByWorkspaceId(workspaceId: string): Promise<Result<WorkspaceMember[]>> {
    const { data, error } = await this.supabase
      .from('workspace_members_view')
      .select('*')
      .eq('account_id', workspaceId)

    if (error) return fail(new DomainError(error.message, 'DB_ERROR'))
    return ok((data || []).map(d => this.toEntity(d)))
  }

  async findById(id: string): Promise<Result<WorkspaceMember | null>> {
    const { data, error } = await this.supabase
      .from('workspace_members_view')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return ok(null)
      return fail(new DomainError(error.message, 'DB_ERROR'))
    }
    return ok(this.toEntity(data))
  }

  async findByUserAndWorkspace(userId: string, workspaceId: string): Promise<Result<WorkspaceMember | null>> {
    const { data, error } = await this.supabase
      .from('workspace_members_view')
      .select('*')
      .eq('user_id', userId)
      .eq('account_id', workspaceId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return ok(null)
      return fail(new DomainError(error.message, 'DB_ERROR'))
    }
    return ok(this.toEntity(data))
  }

  async addMember(member: WorkspaceMember): Promise<Result<WorkspaceMember>> {
    const persistence = {
      id: member.id,
      account_id: member.workspaceId,
      user_id: member.userId,
      role_id: member.roleId,
    }
    // Mutation still goes to the base table
    const { data, error } = await this.table.insert(persistence).select().single()
    if (error) return fail(new DomainError(error.message, 'DB_ERROR'))
    
    // Fetch the enriched version for the result
    return this.findById(data.id) as Promise<Result<WorkspaceMember>>
  }

  async updateMemberRole(memberId: string, roleId: string): Promise<Result<WorkspaceMember>> {
    const { error } = await this.table
      .update({ role_id: roleId })
      .eq('id', memberId)

    if (error) return fail(new DomainError(error.message, 'DB_ERROR'))
    
    // Fetch the enriched version for the result
    return this.findById(memberId) as Promise<Result<WorkspaceMember>>
  }

  async removeMember(memberId: string): Promise<Result<void>> {
    const { error } = await this.table.delete().eq('id', memberId)
    if (error) return fail(new DomainError(error.message, 'DB_ERROR'))
    return ok(undefined)
  }

  async findUserIdByEmail(email: string): Promise<Result<string | null>> {
    const { data, error } = await this.supabase
      .rpc('resolve_user_by_email', { lookup_email: email })

    if (error) return fail(new DomainError(error.message, 'DB_ERROR'))
    return ok(data as string | null)
  }

  private toEntity(data: any): WorkspaceMember {
    return new WorkspaceMember({
      id: data.id,
      workspaceId: data.account_id,
      userId: data.user_id,
      roleId: data.role_id,
      userName: data.user_name,
      userEmail: data.user_email,
      joinedAt: new Date(data.joined_at),
    })
  }
}
