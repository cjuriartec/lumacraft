"use client";

import { useTheme } from "next-themes";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import { GetUserPreferencesUseCase } from "@/modules/auth/application/use-cases/get-user-preferences.use-case";
import { UpdateUserPreferencesUseCase } from "@/modules/auth/application/use-cases/update-user-preferences.use-case";
import {
  mergeUserPreferences,
  UserPreferences,
} from "@/modules/auth/domain/entities/user-profile.entity";
import { SupabaseUserProfileRepository } from "@/modules/auth/infrastructure/repositories/supabase-user-profile.repository";
import { useAuth } from "@/modules/auth/presentation/providers/auth-provider";
import { normalizeGuidancePreferences } from "@/modules/guidance/domain/guidance-preferences";

type ThemeMode = "light" | "dark" | "system";

type UserPreferencesContext = {
  preferences: UserPreferences;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  theme: string | undefined;
  setTheme: (theme: ThemeMode) => void;
};

const Context = createContext<UserPreferencesContext | undefined>(undefined);

const DEFAULT_PREFERENCES: UserPreferences = {
  sidebarCollapsed: true,
  theme: "system",
  guidance: normalizeGuidancePreferences(),
};

function arePreferencesEqual(left: UserPreferences, right: UserPreferences) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { setTheme: setNextTheme, theme: nextTheme } = useTheme();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const hasSynced = useRef(false);

  const repo = useMemo(() => new SupabaseUserProfileRepository(), []);
  const getPrefsUseCase = useMemo(() => new GetUserPreferencesUseCase(repo), [repo]);
  const updatePrefsUseCase = useMemo(() => new UpdateUserPreferencesUseCase(repo), [repo]);

  // Load preferences from server
  useEffect(() => {
    if (!user || hasSynced.current) return;

    const load = async () => {
      const res = await getPrefsUseCase.execute(user.id);
      if (res.ok) {
        const nextPreferences = mergeUserPreferences(DEFAULT_PREFERENCES, res.value);
        setPreferences(nextPreferences);

        // Only update theme if it differs from current next-themes state
        // and we haven't synced yet in this session
        if (nextPreferences.theme && nextPreferences.theme !== nextTheme) {
          setNextTheme(nextPreferences.theme as string);
        }
        hasSynced.current = true;
      }
    };
    load();
  }, [user, getPrefsUseCase, setNextTheme, nextTheme]);

  const updatePreferences = async (prefs: Partial<UserPreferences>) => {
    if (!user) return;

    let hasChanged = false;

    setPreferences((current) => {
      const nextPreferences = mergeUserPreferences(current, prefs);
      hasChanged = !arePreferencesEqual(current, nextPreferences);
      return hasChanged ? nextPreferences : current;
    });

    if (!hasChanged) {
      return;
    }

    await updatePrefsUseCase.execute(user.id, prefs);
  };

  const setAndSaveCollapsed = (collapsed: boolean) => {
    void updatePreferences({ sidebarCollapsed: collapsed });
  };

  const setAndSaveTheme = (newTheme: ThemeMode) => {
    setNextTheme(newTheme);
    void updatePreferences({ theme: newTheme });
  };

  const toggleSidebar = () => {
    setAndSaveCollapsed(!preferences.sidebarCollapsed);
  };

  return (
    <Context.Provider
      value={{
        preferences,
        updatePreferences,
        isCollapsed: preferences.sidebarCollapsed,
        setIsCollapsed: setAndSaveCollapsed,
        toggleSidebar,
        theme: nextTheme,
        setTheme: setAndSaveTheme,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export const useUserPreferences = () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error("useUserPreferences must be used inside UserPreferencesProvider");
  }
  return context;
};

// Keep backwards compat export name if needed, but we will update usages
export const useSidebarPreferences = useUserPreferences;
