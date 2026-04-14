import { SupabaseClient, type User as SupabaseUser } from "@supabase/supabase-js";

import { User } from "@/modules/auth/domain/entities/user.entity";
import { IAuthProvider } from "@/modules/auth/domain/ports/auth-provider.port";
import { Email } from "@/modules/auth/domain/value-objects/email.vo";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { createClient } from "@/shared/infrastructure/supabase/client";

export class SupabaseAuthService implements IAuthProvider {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient();
  }

  public async signInWithGoogle(): Promise<Result<void>> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return fail(new DomainError(error.message, "AUTH_ERROR"));
    }

    return ok(undefined);
  }

  public async signOut(): Promise<Result<void>> {
    const { error } = await this.supabase.auth.signOut();

    if (error) {
      return fail(new DomainError(error.message, "AUTH_ERROR"));
    }

    return ok(undefined);
  }

  public async getCurrentUser(): Promise<Result<User | null>> {
    const {
      data: { session },
      error,
    } = await this.supabase.auth.getSession();

    if (error) {
      return fail(new DomainError(error.message, "AUTH_ERROR"));
    }

    return this.mapSupabaseUser(session?.user ?? null);
  }

  public onAuthStateChange(callback: (user: User | null) => void): () => void {
    const {
      data: { subscription },
    } = this.supabase.auth.onAuthStateChange((_event, session) => {
      const mappedUser = this.mapSupabaseUser(session?.user ?? null);
      if (mappedUser.ok) {
        callback(mappedUser.value);
      }
    });

    return () => subscription.unsubscribe();
  }

  private mapSupabaseUser(user: SupabaseUser | null): Result<User | null> {
    if (!user) {
      return ok(null);
    }

    const email = user.email;
    if (!email) {
      return fail(new DomainError("Authenticated user is missing email", "AUTH_INVALID_USER"));
    }

    const metadata = user.user_metadata ?? {};
    const emailRes = Email.create(email);
    if (!emailRes.ok) return fail(emailRes.error);

    const userRes = User.create({
      id: user.id,
      email: emailRes.value,
      fullName:
        typeof metadata.full_name === "string"
          ? metadata.full_name
          : typeof metadata.name === "string"
            ? metadata.name
            : undefined,
      avatarUrl: typeof metadata.avatar_url === "string" ? metadata.avatar_url : undefined,
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.updated_at || user.created_at),
    });

    if (!userRes.ok) return fail(userRes.error);

    return ok(userRes.value);
  }
}
