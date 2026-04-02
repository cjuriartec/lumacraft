import { SupabaseClient } from '@supabase/supabase-js'
import { BaseRepository } from '@/shared/infrastructure/base-repository'
import { IRoleRepository } from '../../domain/ports/role-repository.port'
import { Role } from '../../domain/entities/role.entity'
import { Result, ok, fail, DomainError } from '@/shared/domain/result'

export class SupabaseRoleRepository extends BaseRepository implements IRoleRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'roles')
  }

  async findAllByAccount(accountId: string): Promise<Result<Role[]>> {
    const { data, error } = await this.table
      .select('*')
      .eq('account_id', accountId)
      .order('name', { ascending: true })

    if (error) return fail(new DomainError(error.message, 'DB_ERROR'))
    return ok((data || []).map((item: any) => this.toEntity(item)))
  }

  async findById(id: string): Promise<Result<Role | null>> {
    const { data, error } = await this.table.select('*').eq('id', id).maybeSingle()
    if (error) return fail(new DomainError(error.message, 'DB_ERROR'))
    if (!data) return ok(null)
    return ok(this.toEntity(data))
  }

  async create(role: Role): Promise<Result<Role>> {
    const persistence = this.toPersistence(role)
    const { data, error } = await this.table.insert(persistence).select().single()
    if (error) return fail(new DomainError(error.message, 'DB_ERROR'))
    return ok(this.toEntity(data))
  }

  async update(role: Role): Promise<Result<Role>> {
    const persistence = this.toPersistence(role)
    const { data, error } = await this.table.update(persistence).eq('id', role.id).select().single()
    if (error) return fail(new DomainError(error.message, 'DB_ERROR'))
    return ok(this.toEntity(data))
  }

  async delete(id: string): Promise<Result<void>> {
    const { error } = await this.table.delete().eq('id', id)
    if (error) return fail(new DomainError(error.message, 'DB_ERROR'))
    return ok(undefined)
  }

  private toEntity(data: any): Role {
    return new Role({
      id: data.id,
      accountId: data.account_id,
      name: data.name,
      description: data.description,
      isSuperadmin: data.is_superadmin,
      createdAt: new Date(data.created_at),
    })
  }

  private toPersistence(role: Role) {
    return {
      id: role.id,
      account_id: role.accountId,
      name: role.name,
      description: role.description,
      is_superadmin: role.isSuperadmin,
    }
  }
}
