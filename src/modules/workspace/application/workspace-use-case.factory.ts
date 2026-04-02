import { SupabaseClient } from "@supabase/supabase-js";

import { SupabaseRoleRepository } from "../infrastructure/repositories/supabase-role.repository";
import { SupabaseWorkspaceRepository } from "../infrastructure/repositories/supabase-workspace.repository";
import { SupabaseWorkspaceMemberRepository } from "../infrastructure/repositories/supabase-workspace-member.repository";
import { GetWorkspacesByUserUseCase } from "./use-cases/get-workspaces-by-user.use-case";
import { ManageMembersUseCase } from "./use-cases/manage-members.use-case";
import { ManageRolesUseCase } from "./use-cases/manage-roles.use-case";

export class WorkspaceUseCaseFactory {
  public static create(supabase: SupabaseClient) {
    return new WorkspaceUseCaseFactoryImpl(supabase);
  }
}

class WorkspaceUseCaseFactoryImpl {
  private repositories: {
    workspace: SupabaseWorkspaceRepository;
    member: SupabaseWorkspaceMemberRepository;
    role: SupabaseRoleRepository;
  };

  constructor(supabase: SupabaseClient) {
    this.repositories = {
      workspace: new SupabaseWorkspaceRepository(supabase),
      member: new SupabaseWorkspaceMemberRepository(supabase),
      role: new SupabaseRoleRepository(supabase),
    };
  }

  public getWorkspacesByUser() {
    return new GetWorkspacesByUserUseCase(this.repositories.workspace);
  }

  public manageMembers() {
    return new ManageMembersUseCase(this.repositories.member, this.repositories.workspace);
  }

  public manageRoles() {
    return new ManageRolesUseCase(this.repositories.role);
  }
}
