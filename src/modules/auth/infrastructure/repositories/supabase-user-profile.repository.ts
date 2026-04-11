import { SupabaseClient } from "@supabase/supabase-js";

import { UserProfile } from "@/modules/auth/domain/entities/user-profile.entity";
import { IUserProfileRepository } from "@/modules/auth/domain/ports/user-profile-repository.port";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { createClient } from "@/shared/infrastructure/supabase/client";

export class SupabaseUserProfileRepository implements IUserProfileRepository {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient();
  }

  public async findById(userId: string): Promise<Result<UserProfile>> {
    const { data, error } = await this.supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      // If not found, it might be that the trigger hasn't run or something.
      // We return a default profile.
      if (error.code === "PGRST116") {
        return UserProfile.create({ id: userId });
      }
      return fail(new DomainError(error.message, "DATABASE_ERROR"));
    }

    return UserProfile.create({
      id: data.id,
      preferences: data.preferences,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    });
  }

  public async save(profile: UserProfile): Promise<Result<void>> {
    const { error } = await this.supabase.from("user_profiles").upsert({
      id: profile.id,
      preferences: profile.preferences,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return fail(new DomainError(error.message, "DATABASE_ERROR"));
    }

    return ok(undefined);
  }
}
