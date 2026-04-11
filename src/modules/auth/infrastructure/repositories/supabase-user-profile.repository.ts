import { SupabaseClient } from "@supabase/supabase-js";

import { UserProfile } from "@/modules/auth/domain/entities/user-profile.entity";
import { IUserProfileRepository } from "@/modules/auth/domain/ports/user-profile-repository.port";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { createClient } from "@/shared/infrastructure/supabase/client";

export class SupabaseUserProfileRepository implements IUserProfileRepository {
  private supabase: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.supabase = client ?? createClient();
  }

  public async findById(userId: string): Promise<Result<UserProfile>> {
    const { data, error } = await this.supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      // PGRST116: JSON object not found (row doesn't exist)
      // Any code containing "schema cache" or table name issues: Table doesn't exist yet
      const isMissingTable =
        error.message.toLowerCase().includes("user_profiles") &&
        error.message.toLowerCase().includes("schema cache");

      if (error.code === "PGRST116" || isMissingTable) {
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
