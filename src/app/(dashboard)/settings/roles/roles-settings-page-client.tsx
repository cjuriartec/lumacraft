"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { useEffect } from "react";

import { useAuth } from "@/modules/auth/presentation/providers/auth-provider";
import { useGuidancePage } from "@/modules/guidance/presentation/hooks/use-guidance-page";
import { MemberManager } from "@/modules/workspace/presentation/components/member-manager";
import { RoleManager } from "@/modules/workspace/presentation/components/role-manager";
import { useMembers } from "@/modules/workspace/presentation/hooks/use-members";
import { useRoles } from "@/modules/workspace/presentation/hooks/use-roles";
import { useWorkspace } from "@/modules/workspace/presentation/providers/workspace-provider";
import { useBreadcrumbs } from "@/shared/presentation/providers/breadcrumb-provider";

export default function RolesSettingsPageClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { members, loading: loadingMembers } = useMembers(currentWorkspace?.id);
  const { roles, loading: loadingRoles } = useRoles(currentWorkspace?.id);

  useBreadcrumbs([{ label: "Configuración", href: "/settings" }, { label: "Roles y Miembros" }]);
  useGuidancePage({ id: "roles-members" });

  useEffect(() => {
    if (loadingMembers || loadingRoles || !currentWorkspace || !user) return;

    const currentUserMember = members.find((m) => m.userId === user.id);
    const currentUserIsAdmin =
      currentWorkspace.ownerId === user.id ||
      roles.find((r) => r.id === currentUserMember?.roleId)?.isSuperadmin === true;

    if (!currentUserIsAdmin) {
      router.replace("/");
    }
  }, [loadingMembers, loadingRoles, members, roles, currentWorkspace, user, router]);

  if (loadingMembers || loadingRoles) {
    return (
      <div className="flex-1 w-full max-w-5xl px-4 py-8 md:px-8 mx-auto flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent opacity-50" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-5xl px-4 py-8 md:px-8 mx-auto space-y-12 animate-in fade-in zoom-in-95 duration-400">
      <div className="flex flex-col gap-1 mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2 text-primary">
          Gestión de Accesos
        </p>
        <h1 className="text-[2rem] md:text-[2.5rem] font-bold leading-tight text-foreground tracking-[-0.02em]">
          Roles y Miembros
        </h1>
        <p className="text-sm font-light text-foreground/70 max-w-xl leading-relaxed">
          Configura la estructura de permisos de tu workspace. Crea roles personalizados y asigna
          miembros para colaborar en tus colecciones de datos.
        </p>
      </div>

      <div className="space-y-16">
        <RoleManager />

        <div className="pt-8 border-t border-border/10">
          <MemberManager />
        </div>
      </div>
    </div>
  );
}
