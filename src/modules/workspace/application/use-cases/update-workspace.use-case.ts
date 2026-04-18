import { DomainError, fail, Result } from "@/shared/domain/result";

import { Workspace } from "../../domain/entities/workspace.entity";
import { IWorkspaceRepository } from "../../domain/ports/workspace-repository.port";

export interface UpdateWorkspaceRequest {
  id: string;
  name: string;
}

export class UpdateWorkspaceUseCase {
  constructor(private readonly workspaceRepository: IWorkspaceRepository) {}

  async execute(request: UpdateWorkspaceRequest): Promise<Result<Workspace>> {
    const existingWorkspace = await this.workspaceRepository.findById(request.id);
    if (!existingWorkspace.ok) return fail(existingWorkspace.error);
    if (!existingWorkspace.value) {
      return fail(new DomainError("Workspace not found", "NOT_FOUND"));
    }

    const nextWorkspace = Workspace.create({
      ...existingWorkspace.value.toJSON(),
      name: request.name,
      updatedAt: new Date(),
    });

    if (!nextWorkspace.ok) {
      return nextWorkspace;
    }

    return this.workspaceRepository.update(nextWorkspace.value);
  }
}
