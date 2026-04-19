"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useWorkspaceAccess } from "@/modules/workspace/presentation/hooks/use-workspace-access";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { canAccessSettings, loading } = useWorkspaceAccess();

  useEffect(() => {
    if (!loading && !canAccessSettings) {
      router.replace("/");
    }
  }, [canAccessSettings, loading, router]);

  if (loading || !canAccessSettings) {
    return <div className="mx-auto h-32 max-w-5xl animate-pulse rounded-3xl bg-surface/60" />;
  }

  return <>{children}</>;
}
