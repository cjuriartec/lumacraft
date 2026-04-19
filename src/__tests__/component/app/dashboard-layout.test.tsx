import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/infrastructure/supabase/env", () => ({
  getMissingPublicSupabaseEnv: () => [],
}));

vi.mock("@/shared/presentation/providers/supabase-provider", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/modules/auth/presentation/providers/auth-provider", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/modules/auth/presentation/components/auth-guard", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/modules/auth/presentation/providers/user-preferences-provider", () => ({
  UserPreferencesProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useUserPreferences: () => ({ isCollapsed: false, toggleSidebar: vi.fn() }),
}));

vi.mock("@/modules/workspace/presentation/providers/workspace-provider", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/modules/authorization/presentation/providers/permission-provider", () => ({
  PermissionProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/modules/guidance/presentation/providers/guidance-provider", () => ({
  GuidanceProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/shared/presentation/providers/breadcrumb-provider", () => ({
  BreadcrumbProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useBreadcrumbItems: () => [],
}));

vi.mock("@/shared/presentation/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/shared/presentation/hooks/use-media-query", () => ({
  useMediaQuery: () => true,
}));

vi.mock("@/modules/auth/presentation/components/user-menu", () => ({
  default: () => <div>user-menu</div>,
}));

vi.mock("@/modules/workspace/presentation/components/workspace-switcher", () => ({
  WorkspaceSwitcher: () => <div>workspace-switcher</div>,
}));

vi.mock("@/modules/workspace/presentation/hooks/use-workspace-access", () => ({
  useWorkspaceAccess: () => ({ canAccessSettings: true }),
}));

vi.mock("@/modules/collection/presentation/components/sidebar-collections", () => ({
  SidebarCollections: () => <Link href="/collections">Colecciones</Link>,
}));

import Link from "next/link";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import DashboardLayout from "@/app/(dashboard)/layout";

describe("DashboardLayout", () => {
  it("shows records and templates entries in the sidebar", () => {
    render(
      <DashboardLayout>
        <div>contenido</div>
      </DashboardLayout>,
    );

    expect(screen.getByRole("link", { name: "Registros" })).toHaveAttribute("href", "/records");
    expect(screen.getByRole("link", { name: "Plantillas" })).toHaveAttribute("href", "/templates");
  });
});
