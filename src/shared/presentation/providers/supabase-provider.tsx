"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createContext, useContext, useState } from "react";

import { createClient } from "@/shared/infrastructure/supabase/client";

type SupabaseContext = {
  supabase: SupabaseClient;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

export default function SupabaseProvider({
  children,
  client,
}: {
  children: React.ReactNode;
  client?: SupabaseClient;
}) {
  const [supabase] = useState(() => client ?? createClient());

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
