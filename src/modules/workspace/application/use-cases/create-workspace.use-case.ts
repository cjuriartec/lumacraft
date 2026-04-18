import { Result } from "@/shared/domain/result";

import { Workspace } from "../../domain/entities/workspace.entity";
import { IWorkspaceRepository } from "../../domain/ports/workspace-repository.port";

export interface CreateWorkspaceRequest {
  name: string;
  ownerId: string;
  settings?: Record<string, unknown>;
  isActive?: boolean;
}

export class CreateWorkspaceUseCase {
  constructor(private readonly workspaceRepository: IWorkspaceRepository) {}

  async execute(request: CreateWorkspaceRequest): Promise<Result<Workspace>> {
    const workspaceResult = Workspace.create({
      id: crypto.randomUUID(),
      name: request.name,
      ownerId: request.ownerId,
      settings: request.settings,
      isActive: request.isActive,
    });

    if (!workspaceResult.ok) {
      return workspaceResult;
    }

    return this.workspaceRepository.create(workspaceResult.value);
  }
}
