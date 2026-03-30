import { IWorkspaceRepository } from '@/modules/workspace/domain/ports/workspace-repository.port'
import { Workspace } from '@/modules/workspace/domain/entities/workspace.entity'
import { Result } from '@/shared/domain/result'

export class GetWorkspacesByUserUseCase {
  constructor(private workspaceRepository: IWorkspaceRepository) {}

  public async execute(userId: string): Promise<Result<Workspace[]>> {
    return this.workspaceRepository.findByOwnerId(userId)
  }
}
