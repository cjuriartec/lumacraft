"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createContext, useContext, useState } from "react";

import { createClient } from "@/shared/infrastructure/supabase/client";
import { hasPublicSupabaseEnv } from "@/shared/infrastructure/supabase/env";

type SupabaseContext = {
  supabase: SupabaseClient;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

export default function SupabaseProvider({
  children,
  client,
  fallback = null,
}: {
  children: React.ReactNode;
  client?: SupabaseClient;
  fallback?: React.ReactNode;
}) {
  const isConfigured = client ? true : hasPublicSupabaseEnv();
  const [supabase] = useState<SupabaseClient | null>(() => {
    if (client) return client;
    if (!isConfigured) return null;
    return createClient();
  });

  if (!supabase) {
    return <>{fallback}</>;
  }

  return (
    <Context.Provider value={{ supabase }}>
      <>{children}</>
    </Context.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(Context);

  if (context === undefined) {
    throw new Error("useSupabase must be used inside SupabaseProvider");
  }

  return context;
};
