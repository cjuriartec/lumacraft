import { Workspace } from '../entities/workspace.entity'
import { Result } from '@/shared/domain/result'

export interface IWorkspaceRepository {
  findById(id: string): Promise<Result<Workspace | null>>
  findByOwnerId(ownerId: string): Promise<Result<Workspace[]>>
  create(workspace: Workspace): Promise<Result<Workspace>>
}
