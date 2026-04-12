import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HelpCenterPage from "@/modules/guidance/presentation/pages/help-center-page";

const navigationState = vi.hoisted(() => ({
  pathname: "/help",
  searchParams: new URLSearchParams(),
  push: vi.fn(),
  replace: vi.fn(),
}));

const guidanceState = vi.hoisted(() => ({
  preferences: {
    viewedArticleIds: [] as string[],
  },
  markArticleViewed: vi.fn().mockResolvedValue(undefined),
  openHelpArticle: vi.fn(),
  startGuide: vi.fn(),
}));

const permissionsState = vi.hoisted(() => ({
  isOwner: false,
  isSuperAdmin: false,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
  useRouter: () => ({
    push: navigationState.push,
    replace: navigationState.replace,
  }),
  useSearchParams: () => navigationState.searchParams,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/modules/guidance/presentation/hooks/use-guidance", () => ({
  useGuidance: () => guidanceState,
}));

vi.mock("@/modules/guidance/presentation/hooks/use-guidance-page", () => ({
  useGuidancePage: vi.fn(),
}));

vi.mock("@/shared/presentation/providers/breadcrumb-provider", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("@/modules/authorization/presentation/providers/permission-provider", () => ({
  usePermissions: () => permissionsState,
}));

describe("HelpCenterPage", () => {
  beforeEach(() => {
    navigationState.searchParams = new URLSearchParams();
    navigationState.push.mockReset();
    navigationState.replace.mockReset();
    guidanceState.preferences.viewedArticleIds = [];
    guidanceState.markArticleViewed.mockReset().mockResolvedValue(undefined);
    guidanceState.openHelpArticle.mockReset();
    guidanceState.startGuide.mockReset();
    permissionsState.isOwner = false;
    permissionsState.isSuperAdmin = false;
  });

  it("selects the first article by default and filters results by search", async () => {
    render(<HelpCenterPage />);

    await waitFor(() => {
      expect(navigationState.replace).toHaveBeenCalledWith("/help?article=primeros-pasos", {
        scroll: false,
      });
    });

    fireEvent.change(screen.getByPlaceholderText("Buscar por tema, feature o problema..."), {
      target: { value: "roles" },
    });

    expect(screen.getAllByText("Roles y miembros").length).toBeGreaterThan(0);
  });

  it("respects deep links and disables admin CTAs for non-admin users", async () => {
    navigationState.searchParams = new URLSearchParams("article=configuracion-ia");

    render(<HelpCenterPage />);

    expect(screen.getByRole("heading", { name: "Configuración IA" })).toBeInTheDocument();
    expect(screen.getByText("Solo administración")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Requiere permisos de administración" }),
    ).toBeDisabled();

    await waitFor(() => {
      expect(guidanceState.markArticleViewed).toHaveBeenCalledWith("configuracion-ia");
    });
  });
});
