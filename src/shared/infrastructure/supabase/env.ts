const PUBLIC_SUPABASE_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

export function getPublicSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function getMissingPublicSupabaseEnv(): string[] {
  const env = getPublicSupabaseEnv();

  return PUBLIC_SUPABASE_ENV_KEYS.filter((key) => {
    if (key === "NEXT_PUBLIC_SUPABASE_URL") {
      return !env.url;
    }

    return !env.publishableKey;
  });
}

export function hasPublicSupabaseEnv() {
  return getMissingPublicSupabaseEnv().length === 0;
}
