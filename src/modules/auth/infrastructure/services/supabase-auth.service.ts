import { createClient } from '@/shared/infrastructure/supabase/client'
import { IAuthProvider } from '@/modules/auth/domain/ports/auth-provider.port'
import { User } from '@/modules/auth/domain/entities/user.entity'
import { Email } from '@/modules/auth/domain/value-objects/email.vo'
import { Result, ok, fail, DomainError } from '@/shared/domain/result'
import { SupabaseClient } from '@supabase/supabase-js'

export class SupabaseAuthService implements IAuthProvider {
  private supabase: SupabaseClient

  constructor() {
    this.supabase = createClient()
  }

  public async signInWithGoogle(): Promise<Result<void>> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      return fail(new DomainError(error.message, 'AUTH_ERROR'))
    }

    return ok(undefined)
  }

  public async signOut(): Promise<Result<void>> {
    const { error } = await this.supabase.auth.signOut()

    if (error) {
      return fail(new DomainError(error.message, 'AUTH_ERROR'))
    }

    return ok(undefined)
  }

  public async getCurrentUser(): Promise<Result<User | null>> {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser()

    if (error) {
      return fail(new DomainError(error.message, 'AUTH_ERROR'))
    }

    if (!user) {
      return ok(null)
    }

    const emailRes = Email.create(user.email!)
    if (!emailRes.ok) return fail(emailRes.error)

    return ok(
      new User({
        id: user.id,
        email: emailRes.value,
        fullName: user.user_metadata.full_name,
        avatarUrl: user.user_metadata.avatar_url,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at || user.created_at),
      })
    )
  }

  public onAuthStateChange(callback: (user: User | null) => void): () => void {
    const {
      data: { subscription },
    } = this.supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        callback(null)
        return
      }

      const emailRes = Email.create(session.user.email!)
      if (emailRes.ok) {
        callback(
          new User({
            id: session.user.id,
            email: emailRes.value,
            fullName: session.user.user_metadata.full_name,
            avatarUrl: session.user.user_metadata.avatar_url,
          })
        )
      }
    })

    return () => subscription.unsubscribe()
  }
}
