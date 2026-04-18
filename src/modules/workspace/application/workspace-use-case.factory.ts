import { SupabaseClient } from "@supabase/supabase-js";

import { SupabaseCollectionRepository } from "@/modules/collection/infrastructure/repositories/supabase-collection.repository";
import { SupabaseRecordRepository } from "@/modules/collection/infrastructure/repositories/supabase-record.repository";
import { SupabaseTemplateRepository } from "@/modules/template/infrastructure/repositories/supabase-template.repository";

import { SupabaseRoleRepository } from "../infrastructure/repositories/supabase-role.repository";
import { SupabaseWorkspaceRepository } from "../infrastructure/repositories/supabase-workspace.repository";
import { SupabaseWorkspaceMemberRepository } from "../infrastructure/repositories/supabase-workspace-member.repository";
import { CreateWorkspaceUseCase } from "./use-cases/create-workspace.use-case";
import { GetWorkspaceStatsUseCase } from "./use-cases/get-workspace-stats.use-case";
import { GetWorkspacesByUserUseCase } from "./use-cases/get-workspaces-by-user.use-case";
import { ManageMembersUseCase } from "./use-cases/manage-members.use-case";
import { ManageRolesUseCase } from "./use-cases/manage-roles.use-case";
import { UpdateWorkspaceUseCase } from "./use-cases/update-workspace.use-case";

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
    collection: SupabaseCollectionRepository;
    record: SupabaseRecordRepository;
    template: SupabaseTemplateRepository;
  };

  constructor(supabase: SupabaseClient) {
    this.repositories = {
      workspace: new SupabaseWorkspaceRepository(supabase),
      member: new SupabaseWorkspaceMemberRepository(supabase),
      role: new SupabaseRoleRepository(supabase),
      collection: new SupabaseCollectionRepository(supabase),
      record: new SupabaseRecordRepository(supabase),
      template: new SupabaseTemplateRepository(supabase),
    };
  }

  public getWorkspacesByUser() {
    return new GetWorkspacesByUserUseCase(this.repositories.workspace);
  }

  public createWorkspace() {
    return new CreateWorkspaceUseCase(this.repositories.workspace);
  }

  public updateWorkspace() {
    return new UpdateWorkspaceUseCase(this.repositories.workspace);
  }

  public manageMembers() {
    return new ManageMembersUseCase(this.repositories.member, this.repositories.workspace);
  }

  public manageRoles() {
    return new ManageRolesUseCase(this.repositories.role);
  }

  public getWorkspaceStats() {
    return new GetWorkspaceStatsUseCase(
      this.repositories.collection,
      this.repositories.record,
      this.repositories.template,
    );
  }
}
