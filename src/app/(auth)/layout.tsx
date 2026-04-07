import AuthProvider from "@/modules/auth/presentation/providers/auth-provider";
import { getMissingPublicSupabaseEnv } from "@/shared/infrastructure/supabase/env";
import SupabaseConfigMissingState from "@/shared/presentation/components/supabase-config-missing-state";
import SupabaseProvider from "@/shared/presentation/providers/supabase-provider";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const missingEnvVars = getMissingPublicSupabaseEnv();

  if (missingEnvVars.length > 0) {
    return <SupabaseConfigMissingState missingEnvVars={missingEnvVars} />;
  }

  return (
    <SupabaseProvider>
      <AuthProvider>{children}</AuthProvider>
    </SupabaseProvider>
  );
}
