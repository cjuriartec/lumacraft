"use client";

import { useTheme } from "next-themes";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import { GetUserPreferencesUseCase } from "@/modules/auth/application/use-cases/get-user-preferences.use-case";
import { UpdateUserPreferencesUseCase } from "@/modules/auth/application/use-cases/update-user-preferences.use-case";
import { SupabaseUserProfileRepository } from "@/modules/auth/infrastructure/repositories/supabase-user-profile.repository";
import { useAuth } from "@/modules/auth/presentation/providers/auth-provider";

type ThemeMode = "light" | "dark" | "system";

type UserPreferencesContext = {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  theme: string | undefined;
  setTheme: (theme: ThemeMode) => void;
};

const Context = createContext<UserPreferencesContext | undefined>(undefined);

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { setTheme: setNextTheme, theme: nextTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(true);
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
        setIsCollapsed(res.value.sidebarCollapsed);

        // Only update theme if it differs from current next-themes state
        // and we haven't synced yet in this session
        if (res.value.theme && res.value.theme !== nextTheme) {
          setNextTheme(res.value.theme as string);
        }
        hasSynced.current = true;
      }
    };
    load();
  }, [user, getPrefsUseCase, setNextTheme, nextTheme]);

  const updateServerPreference = async (prefs: {
    sidebarCollapsed?: boolean;
    theme?: ThemeMode;
  }) => {
    if (!user) return;
    await updatePrefsUseCase.execute(user.id, prefs);
  };

  const setAndSaveCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    updateServerPreference({ sidebarCollapsed: collapsed });
  };

  const setAndSaveTheme = (newTheme: ThemeMode) => {
    setNextTheme(newTheme);
    updateServerPreference({ theme: newTheme });
  };

  const toggleSidebar = () => {
    setAndSaveCollapsed(!isCollapsed);
  };

  return (
    <Context.Provider
      value={{
        isCollapsed,
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
