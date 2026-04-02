import { SupabaseClient } from "@supabase/supabase-js";

import { SupabasePermissionRepository } from "../infrastructure/repositories/supabase-permission.repository";
import { CheckPermissionUseCase } from "./use-cases/check-permission.use-case";
import { GetUserPermissionsUseCase } from "./use-cases/get-user-permissions.use-case";
import { ManagePermissionsUseCase } from "./use-cases/manage-permissions.use-case";

export class AuthzUseCaseFactory {
  public static create(supabase: SupabaseClient) {
    return new AuthzUseCaseFactoryImpl(supabase);
  }
}

class AuthzUseCaseFactoryImpl {
  private repositories: {
    permission: SupabasePermissionRepository;
  };
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.repositories = {
      permission: new SupabasePermissionRepository(supabase),
    };
  }

  public getUserPermissions() {
    return new GetUserPermissionsUseCase(this.repositories.permission, this.supabase);
  }

  public checkPermission() {
    return new CheckPermissionUseCase(this.repositories.permission, this.supabase);
  }

  public managePermissions() {
    return new ManagePermissionsUseCase(this.repositories.permission);
  }
}
