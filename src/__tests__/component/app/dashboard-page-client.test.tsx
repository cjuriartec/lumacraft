import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DashboardPageClient from "@/app/(dashboard)/dashboard-page-client";

const authState = vi.hoisted(() => ({
  user: { fullName: "Cesar Ujos" },
}));

const statsState = vi.hoisted(() => ({
  stats: {
    collectionsCount: 3,
    recordsCount: 12,
    templatesCount: 2,
  },
  loading: false,
}));

vi.mock("@/modules/auth/presentation/providers/auth-provider", () => ({
  useAuth: () => authState,
}));

vi.mock("@/app/(dashboard)/use-dashboard-stats", () => ({
  useDashboardStats: () => statsState,
}));

vi.mock("@/modules/guidance/presentation/hooks/use-guidance-page", () => ({
  useGuidancePage: vi.fn(),
}));

vi.mock("@/shared/presentation/providers/breadcrumb-provider", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("DashboardPageClient", () => {
  beforeEach(() => {
    authState.user = { fullName: "Cesar Ujos" };
    statsState.stats = {
      collectionsCount: 3,
      recordsCount: 12,
      templatesCount: 2,
    };
    statsState.loading = false;
  });

  it("renders the main navigation cards and no onboarding checklist", () => {
    const { container } = render(<DashboardPageClient />);

    expect(screen.getByText("Hola, Cesar")).toBeInTheDocument();
    expect(screen.queryByText("Onboarding progresivo")).not.toBeInTheDocument();
    expect(container.querySelector('a[href="/collections"]')).toBeInTheDocument();
    expect(container.querySelector('a[href="/records"]')).toBeInTheDocument();
    expect(container.querySelector('a[href="/templates"]')).toBeInTheDocument();
  });

  it("shows the stats returned by the dashboard hook", () => {
    render(<DashboardPageClient />);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
