"use client";

import { Building2, ShieldCheck, Users } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/shared/presentation/components/ui/tabs";

import { useWorkspace } from "../providers/workspace-provider";

const tabs = [
  { value: "general", href: "/settings/workspace/general", label: "General", icon: Building2 },
  { value: "users", href: "/settings/workspace/users", label: "Usuarios", icon: Users },
  { value: "roles", href: "/settings/workspace/roles", label: "Roles", icon: ShieldCheck },
];

function getActiveTab(pathname: string) {
  if (pathname.includes("/settings/workspace/users")) return "users";
  if (pathname.includes("/settings/workspace/roles")) return "roles";
  return "general";
}

export function WorkspaceSettingsShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentWorkspace } = useWorkspace();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 md:px-8">
      <div className="space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
          Configuración
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h1 className="text-[2.5rem] font-bold tracking-[-0.02em] text-foreground">
              {currentWorkspace?.name ?? "Workspace"}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-foreground/70">
              Administra miembros, roles y la configuración general de este espacio.
            </p>
          </div>
        </div>
      </div>

      <Tabs
        value={getActiveTab(pathname)}
        onValueChange={(value) => {
          const nextTab = tabs.find((tab) => tab.value === value);
          if (nextTab) {
            router.push(nextTab.href);
          }
        }}
        variant="line"
        className="mt-8 w-full"
      >
        <TabsList className="mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                <Icon size={15} />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="pb-12">{children}</div>
    </div>
  );
}
