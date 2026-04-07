import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getPrivilegedSupabaseKey() {
  return process.env.SUPABASE_SECRET_KEY ?? null;
}

export function createAdminClientOrNull() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const privilegedKey = getPrivilegedSupabaseKey();

  if (!supabaseUrl || !privilegedKey) {
    return null;
  }

  return createSupabaseClient(supabaseUrl, privilegedKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createAdminClient() {
  const client = createAdminClientOrNull();

  if (!client) {
    throw new Error("Missing SUPABASE_SECRET_KEY");
  }

  return client;
}
