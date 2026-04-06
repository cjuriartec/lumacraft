import { Result } from "@/shared/domain/result";

import { WorkspaceMember } from "../entities/workspace-member.entity";

export interface IWorkspaceMemberRepository {
  findByWorkspaceId(workspaceId: string): Promise<Result<WorkspaceMember[]>>;
  findById(id: string): Promise<Result<WorkspaceMember | null>>;
  addMember(member: WorkspaceMember): Promise<Result<WorkspaceMember>>;
  updateMemberRole(memberId: string, roleId: string): Promise<Result<WorkspaceMember>>;
  removeMember(memberId: string): Promise<Result<void>>;
  findByUserAndWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<Result<WorkspaceMember | null>>;
  findUserIdByEmail(email: string): Promise<Result<string | null>>;
}
