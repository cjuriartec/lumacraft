"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { SignInWithGoogleUseCase } from "@/modules/auth/application/use-cases/sign-in-with-google.use-case";
import { SignOutUseCase } from "@/modules/auth/application/use-cases/sign-out.use-case";
import { User } from "@/modules/auth/domain/entities/user.entity";
import { IAuthProvider } from "@/modules/auth/domain/ports/auth-provider.port";
import { SupabaseAuthService } from "@/modules/auth/infrastructure/services/supabase-auth.service";

type AuthContext = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Context = createContext<AuthContext | undefined>(undefined);

export default function AuthProvider({
  children,
  authService,
}: {
  children: React.ReactNode;
  authService?: IAuthProvider;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const service = useMemo(() => authService ?? new SupabaseAuthService(), [authService]);
  const signInUseCase = useMemo(() => new SignInWithGoogleUseCase(service), [service]);
  const signOutUseCase = useMemo(() => new SignOutUseCase(service), [service]);

  useEffect(() => {
    let active = true;

    const enrichUser = async (baseUser: User) => {
      const profileResult = await service.getUserProfile(baseUser.id);
      if (active && profileResult.ok && profileResult.value) {
        baseUser.updateProfileData(profileResult.value);
        // Create a new reference to trigger React re-render
        const enrichedUser = User.create(baseUser.toJSON());
        if (enrichedUser.ok) {
          setUser(enrichedUser.value);
        }
      }
    };

    const checkUser = async () => {
      const res = await service.getCurrentUser();
      if (active && res.ok && res.value) {
        setUser(res.value);
        enrichUser(res.value);
      }
      if (active) {
        setLoading(false);
      }
    };

    checkUser();

    const unsubscribe = service.onAuthStateChange((nextUser) => {
      if (active) {
        setUser(nextUser);
        if (nextUser) {
          enrichUser(nextUser);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [service]);

  const signInWithGoogle = useCallback(async () => {
    await signInUseCase.execute();
  }, [signInUseCase]);

  const signOut = useCallback(async () => {
    await signOutUseCase.execute();
  }, [signOutUseCase]);

  return (
    <Context.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </Context.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};
