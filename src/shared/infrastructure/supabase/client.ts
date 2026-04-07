import { createBrowserClient } from "@supabase/ssr";

import { getMissingPublicSupabaseEnv, getPublicSupabaseEnv } from "./env";

export const createClient = () => {
  const { url, publishableKey } = getPublicSupabaseEnv();
  const missingEnvVars = getMissingPublicSupabaseEnv();

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing Supabase public env vars: ${missingEnvVars.join(", ")}. Configure them before creating the browser client.`,
    );
  }

  return createBrowserClient(url!, publishableKey!);
};
