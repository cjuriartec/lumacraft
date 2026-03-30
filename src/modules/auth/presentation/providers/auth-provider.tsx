'use client'

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { User } from '@/modules/auth/domain/entities/user.entity'
import { SupabaseAuthService } from '@/modules/auth/infrastructure/services/supabase-auth.service'
import { SignInWithGoogleUseCase } from '@/modules/auth/application/use-cases/sign-in-with-google.use-case'
import { SignOutUseCase } from '@/modules/auth/application/use-cases/sign-out.use-case'

type AuthContext = {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const Context = createContext<AuthContext | undefined>(undefined)

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const authService = useMemo(() => new SupabaseAuthService(), [])
  const signInUseCase = useMemo(() => new SignInWithGoogleUseCase(authService), [authService])
  const signOutUseCase = useMemo(() => new SignOutUseCase(authService), [authService])

  useEffect(() => {
    const checkUser = async () => {
      const res = await authService.getCurrentUser()
      if (res.ok) {
        setUser(res.value)
      }
      setLoading(false)
    }

    checkUser()

    const unsubscribe = authService.onAuthStateChange((user) => {
      setUser(user)
    })

    return () => unsubscribe()
  }, [authService])

  const signInWithGoogle = useCallback(async () => {
    await signInUseCase.execute()
  }, [signInUseCase])

  const signOut = useCallback(async () => {
    await signOutUseCase.execute()
  }, [signOutUseCase])

  return (
    <Context.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </Context.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
