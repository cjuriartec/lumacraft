import { BaseRepository } from '@/shared/infrastructure/base-repository'
import { IWorkspaceRepository } from '../../domain/ports/workspace-repository.port'
import { Workspace } from '../../domain/entities/workspace.entity'
import { Result, ok, fail, DomainError } from '@/shared/domain/result'

import { SupabaseClient } from '@supabase/supabase-js'

export class SupabaseWorkspaceRepository extends BaseRepository implements IWorkspaceRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'accounts')
  }

  public async findById(id: string): Promise<Result<Workspace | null>> {
    const { data, error } = await this.table.select('*').eq('id', id).single()

    if (error) {
      if (error.code === 'PGRST116') return ok(null)
      return fail(new DomainError(error.message, 'DB_ERROR'))
    }

    return ok(this.toEntity(data))
  }

  public async findByOwnerId(ownerId: string): Promise<Result<Workspace[]>> {
    const { data, error } = await this.table.select('*').eq('owner_id', ownerId)

    if (error) {
      return fail(new DomainError(error.message, 'DB_ERROR'))
    }

    return ok(data.map((item: Record<string, unknown>) => this.toEntity(item)))
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
      .single()

    if (error) {
      return fail(new DomainError(error.message, 'DB_ERROR'))
    }

    return ok(this.toEntity(data))
  }

  private toEntity(data: Record<string, unknown>): Workspace {
    return new Workspace({
      id: data.id as string,
      name: data.name as string,
      ownerId: data.owner_id as string,
      settings: data.settings as Record<string, unknown> | undefined,
      isActive: data.is_active as boolean,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    })
  }
}
