"use client";

import React from "react";

import { PermissionManager } from "@/modules/authorization/presentation/components/permission-manager";
import { useBreadcrumbs } from "@/shared/presentation/providers/breadcrumb-provider";

export default function PermissionsPageClient() {
  useBreadcrumbs([{ label: "Configuración", href: "/settings" }, { label: "Gestión de Permisos" }]);

  return (
    <div className="flex-1 w-full max-w-5xl px-4 py-8 md:px-8 mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-400">
      <div className="flex flex-col gap-1 mb-8 px-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2 text-primary">
          Seguridad
        </p>
        <h1 className="text-[2rem] md:text-[2.5rem] font-bold leading-tight text-foreground tracking-[-0.02em]">
          Gestión de Permisos
        </h1>
        <p className="text-sm font-light text-foreground/70 max-w-xl leading-relaxed">
          Configura los accesos granulares por colección para cada rol en tu workspace. Estas reglas
          son forzadas a nivel de base de datos (RLS).
        </p>
      </div>

      <PermissionManager />
    </div>
  );
}
