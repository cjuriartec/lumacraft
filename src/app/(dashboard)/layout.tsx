"use client";

import {
  ChevronRight,
  FileText,
  LayoutDashboard,
  PanelLeft,
  Rows3,
  Settings,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import AuthGuard from "@/modules/auth/presentation/components/auth-guard";
import UserMenu from "@/modules/auth/presentation/components/user-menu";
import AuthProvider from "@/modules/auth/presentation/providers/auth-provider";
import {
  UserPreferencesProvider,
  useUserPreferences as useSidebarPreferences,
} from "@/modules/auth/presentation/providers/user-preferences-provider";
import { PermissionProvider } from "@/modules/authorization/presentation/providers/permission-provider";
import { GuidanceProvider } from "@/modules/guidance/presentation/providers/guidance-provider";
import { WorkspaceSwitcher } from "@/modules/workspace/presentation/components/workspace-switcher";
import { useWorkspaceAccess } from "@/modules/workspace/presentation/hooks/use-workspace-access";
import WorkspaceProvider from "@/modules/workspace/presentation/providers/workspace-provider";
import { getMissingPublicSupabaseEnv } from "@/shared/infrastructure/supabase/env";
import SupabaseConfigMissingState from "@/shared/presentation/components/supabase-config-missing-state";
import { TooltipProvider } from "@/shared/presentation/components/ui/tooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/presentation/components/ui/tooltip";
import { useMediaQuery } from "@/shared/presentation/hooks/use-media-query";
import {
  BreadcrumbItem,
  BreadcrumbProvider,
  useBreadcrumbItems,
} from "@/shared/presentation/providers/breadcrumb-provider";
import SupabaseProvider from "@/shared/presentation/providers/supabase-provider";

import { SidebarCollections } from "../../modules/collection/presentation/components/sidebar-collections";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const missingEnvVars = getMissingPublicSupabaseEnv();

  if (missingEnvVars.length > 0) {
    return <SupabaseConfigMissingState missingEnvVars={missingEnvVars} />;
  }

  return (
    <SupabaseProvider>
      <AuthProvider>
        <UserPreferencesProvider>
          <WorkspaceProvider>
            <AuthGuard>
              <BreadcrumbProvider>
                <PermissionProvider>
                  <GuidanceProvider>
                    <TooltipProvider delayDuration={0}>
                      <DashboardContent sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                        {children}
                      </DashboardContent>
                    </TooltipProvider>
                  </GuidanceProvider>
                </PermissionProvider>
              </BreadcrumbProvider>
            </AuthGuard>
          </WorkspaceProvider>
        </UserPreferencesProvider>
      </AuthProvider>
    </SupabaseProvider>
  );
}

function DashboardContent({
  children,
  sidebarOpen,
  setSidebarOpen,
}: {
  children: React.ReactNode;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Will be refactored further below */}
      <DashboardSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <DashboardHeader setSidebarOpen={setSidebarOpen} />

        {/* Page Body */}
        <main className="flex-1 overflow-y-auto bg-background">{children}</main>
      </div>
    </div>
  );
}

function DashboardHeader({ setSidebarOpen }: { setSidebarOpen: (o: boolean) => void }) {
  return (
    <header className="h-14 flex items-center justify-between px-6 shrink-0 bg-background border-b border-border/30">
      <div className="flex items-center gap-3">
        <button
          className="md:hidden p-1.5 rounded-lg transition-colors text-foreground/70 hover:bg-surface"
          onClick={() => setSidebarOpen(true)}
        >
          <PanelLeft size={18} />
        </button>
        <Breadcrumb />
      </div>

      <div className="flex items-center gap-3">
        <UserMenu />
      </div>
    </header>
  );
}

function Breadcrumb() {
  const contextItems = useBreadcrumbItems();
  const pathname = usePathname();

  // Fallback: derive from pathname when no context items are registered
  const fallbackLabels: Record<string, string> = {
    collections: "Colecciones",
    records: "Registros",
    templates: "Plantillas",
    relations: "Relaciones",
    settings: "Configuración",
    help: "Ayuda",
  };

  let items: BreadcrumbItem[];

  if (contextItems.length > 0) {
    items = contextItems;
  } else {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      items = [{ label: "Inicio" }];
    } else {
      items = [{ label: fallbackLabels[segments[0]] || segments[0] }];
    }
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5">
      <Link
        href="/"
        className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors"
      >
        Workspace
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={index} className="flex items-center gap-1.5">
            <ChevronRight size={12} className="text-foreground/20" />
            {isLast || !item.href ? (
              <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function DashboardSidebar({
  sidebarOpen,
  setSidebarOpen,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
}) {
  const { isCollapsed, toggleSidebar } = useSidebarPreferences();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const effectiveIsCollapsed = isCollapsed && isDesktop;

  return (
    <aside
      className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out bg-sidebar border-r border-border/30 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      } ${effectiveIsCollapsed ? "md:w-[72px]" : "w-64"} w-64`}
    >
      {/* Brand + Workspace Switcher */}
      <div
        data-guidance-anchor="workspace-switcher"
        className={`py-4 flex items-center justify-center ${effectiveIsCollapsed ? "px-0" : "px-3"}`}
      >
        <WorkspaceSwitcher showName={!effectiveIsCollapsed} />
      </div>

      {/* Nav */}
      <SidebarNav setSidebarOpen={setSidebarOpen} isCollapsed={effectiveIsCollapsed} />

      {/* Footer Toggle Block */}
      <div className={`p-3 border-t border-border/10 ${!isDesktop ? "hidden" : "block"}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleSidebar}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-foreground/50 hover:text-foreground hover:bg-surface transition-colors ${
                effectiveIsCollapsed ? "justify-center" : ""
              }`}
            >
              <PanelLeft
                size={16}
                className={`transition-transform duration-300 ${effectiveIsCollapsed ? "rotate-180" : ""}`}
              />
              {!effectiveIsCollapsed && <span className="text-[13px] font-medium">Colapsar</span>}
            </button>
          </TooltipTrigger>
          {effectiveIsCollapsed && <TooltipContent side="right">Expandir Sidebar</TooltipContent>}
        </Tooltip>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  icon,
  label,
  onClick,
  isCollapsed,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  isCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));

  const content = (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150 ${
        active
          ? "text-primary bg-primary/10"
          : "text-foreground/70 hover:text-foreground hover:bg-surface"
      } ${isCollapsed ? "justify-center" : ""}`}
    >
      <span className={active ? "text-primary" : "text-inherit opacity-70"}>{icon}</span>
      {!isCollapsed && <span className="flex-1 truncate">{label}</span>}
      {!isCollapsed && active && <span className="w-1 h-1 rounded-full bg-primary" />}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

function SidebarNav({
  setSidebarOpen,
  isCollapsed,
}: {
  setSidebarOpen: (o: boolean) => void;
  isCollapsed: boolean;
}) {
  const { canAccessSettings } = useWorkspaceAccess();

  return (
    <nav
      data-guidance-anchor="sidebar-nav"
      className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-hide"
    >
      <div className={`mb-4 ${isCollapsed ? "hidden" : ""}`}>
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] px-3 text-foreground/30">
          Principal
        </p>
      </div>

      <NavLink
        href="/"
        icon={<LayoutDashboard size={18} strokeWidth={1.5} />}
        label="Inicio"
        isCollapsed={isCollapsed}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Collections Section - Will be replaced with SidebarCollections */}
      <SidebarCollections isCollapsed={isCollapsed} setSidebarOpen={setSidebarOpen} />

      <NavLink
        href="/records"
        icon={<Rows3 size={18} strokeWidth={1.5} />}
        label="Registros"
        isCollapsed={isCollapsed}
        onClick={() => setSidebarOpen(false)}
      />

      <NavLink
        href="/templates"
        icon={<FileText size={18} strokeWidth={1.5} />}
        label="Plantillas"
        isCollapsed={isCollapsed}
        onClick={() => setSidebarOpen(false)}
      />

      <NavLink
        href="/relations"
        icon={<Share2 size={18} strokeWidth={1.5} />}
        label="Relaciones"
        isCollapsed={isCollapsed}
        onClick={() => setSidebarOpen(false)}
      />

      {canAccessSettings ? (
        <div className="pt-4 mt-auto border-t border-border/5">
          <NavLink
            href="/settings"
            icon={<Settings size={18} strokeWidth={1.5} />}
            label="Configuración"
            isCollapsed={isCollapsed}
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      ) : null}
    </nav>
  );
}
