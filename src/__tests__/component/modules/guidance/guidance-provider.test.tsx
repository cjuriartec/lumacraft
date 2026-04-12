import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useGuidance } from "@/modules/guidance/presentation/hooks/use-guidance";
import { useGuidancePage } from "@/modules/guidance/presentation/hooks/use-guidance-page";
import { GuidanceProvider } from "@/modules/guidance/presentation/providers/guidance-provider";

const navigationState = vi.hoisted(() => ({
  pathname: "/",
  searchParams: new URLSearchParams(),
  push: vi.fn(),
  replace: vi.fn(),
}));

const authState = vi.hoisted(() => ({
  user: {
    id: "user-1",
    createdAt: new Date("2026-04-12T10:00:00.000Z"),
  },
}));

const preferencesState = vi.hoisted(() => ({
  preferences: {
    sidebarCollapsed: true,
    theme: "system" as const,
    guidance: {
      completedMilestones: [],
      completedGuideIds: [],
      dismissedGuideIds: [],
      viewedArticleIds: [],
      existingUserNudgeDismissed: false,
    },
  },
  updatePreferences: vi.fn().mockResolvedValue(undefined),
}));

const permissionsState = vi.hoisted(() => ({
  isOwner: true,
  isSuperAdmin: false,
}));

const workspaceState = vi.hoisted(() => ({
  currentWorkspace: {
    id: "workspace-1",
  },
}));

const guidanceSnapshotState = vi.hoisted(() => ({
  collections: [{ id: "collection-1" }],
  fields: [] as Array<{ collection_id: string }>,
  records: [] as Array<{ id: string; collection_id: string }>,
  templates: [] as Array<{ id: string; collection_id: string | null }>,
  documents: [] as Array<{ collection_id: string; record_id: string; template_id: string }>,
  aiSettings: null as { provider_secrets?: Record<string, unknown> } | null,
}));

function createSupabaseQuery(table: string) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    maybeSingle: vi.fn(async () => {
      if (table === "account_ai_settings") {
        return { data: guidanceSnapshotState.aiSettings, error: null };
      }

      return { data: null, error: null };
    }),
    limit: vi.fn(async () => {
      if (table === "collections") {
        return { data: guidanceSnapshotState.collections, error: null };
      }

      if (table === "fields") {
        return { data: guidanceSnapshotState.fields, error: null };
      }

      if (table === "records") {
        return { data: guidanceSnapshotState.records, error: null };
      }

      if (table === "templates") {
        return { data: guidanceSnapshotState.templates, error: null };
      }

      if (table === "record_documents") {
        return { data: guidanceSnapshotState.documents, error: null };
      }

      return { data: [], error: null };
    }),
  };

  return query;
}

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
  useSearchParams: () => navigationState.searchParams,
  useRouter: () => ({
    push: navigationState.push,
    replace: navigationState.replace,
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("@/modules/auth/presentation/providers/auth-provider", () => ({
  useAuth: () => authState,
}));

vi.mock("@/modules/auth/presentation/providers/user-preferences-provider", () => ({
  useUserPreferences: () => preferencesState,
}));

vi.mock("@/modules/authorization/presentation/providers/permission-provider", () => ({
  usePermissions: () => ({
    ...permissionsState,
  }),
}));

vi.mock("@/modules/workspace/presentation/providers/workspace-provider", () => ({
  useWorkspace: () => workspaceState,
}));

vi.mock("@/shared/presentation/providers/supabase-provider", () => ({
  useSupabase: () => ({
    supabase: {
      from: (table: string) => createSupabaseQuery(table),
    },
  }),
}));

function DashboardContextWithAnchor() {
  useGuidancePage({ id: "dashboard" });

  return <div data-guidance-anchor="workspace-switcher">workspace anchor</div>;
}

function DashboardContextWithoutAnchor() {
  useGuidancePage({ id: "dashboard" });

  return <div>sin anchors</div>;
}

function GuidanceActionHarness() {
  const { startGuide } = useGuidance();

  return (
    <button type="button" onClick={() => startGuide("collection-schema")}>
      Abrir esquema
    </button>
  );
}

describe("GuidanceProvider", () => {
  beforeEach(() => {
    navigationState.pathname = "/";
    navigationState.searchParams = new URLSearchParams();
    navigationState.push.mockReset();
    navigationState.replace.mockReset();
    authState.user.createdAt = new Date("2026-04-12T10:00:00.000Z");
    preferencesState.preferences = {
      sidebarCollapsed: true,
      theme: "system",
      guidance: {
        completedMilestones: [],
        completedGuideIds: [],
        dismissedGuideIds: [],
        viewedArticleIds: [],
        existingUserNudgeDismissed: false,
      },
    };
    preferencesState.updatePreferences.mockReset().mockResolvedValue(undefined);
    guidanceSnapshotState.collections = [{ id: "collection-1" }];
    guidanceSnapshotState.fields = [];
    guidanceSnapshotState.records = [];
    guidanceSnapshotState.templates = [];
    guidanceSnapshotState.documents = [];
    guidanceSnapshotState.aiSettings = null;
    window.sessionStorage.clear();
  });

  it("auto-starts the dashboard guide for eligible new users and completes its milestone", async () => {
    render(
      <GuidanceProvider>
        <DashboardContextWithAnchor />
      </GuidanceProvider>,
    );

    await screen.findByText("El workspace define el contexto");

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await screen.findByText("El sidebar es tu mapa operativo");

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await screen.findByText("Sigue el plan sugerido");

    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));

    await waitFor(() => {
      expect(
        preferencesState.updatePreferences.mock.calls.some(([arg]) =>
          arg.guidance?.completedMilestones?.includes("navigation_understood"),
        ),
      ).toBe(true);
    });
  });

  it("shows the new help badge for existing users without forcing a guide", () => {
    authState.user.createdAt = new Date("2026-04-09T10:00:00.000Z");

    render(
      <GuidanceProvider>
        <DashboardContextWithAnchor />
      </GuidanceProvider>,
    );

    expect(screen.queryByText("El workspace define el contexto")).not.toBeInTheDocument();
    expect(screen.getByText("Nuevo")).toBeInTheDocument();
  });

  it("renders the coachmark even when the anchor is missing", async () => {
    render(
      <GuidanceProvider>
        <DashboardContextWithoutAnchor />
      </GuidanceProvider>,
    );

    expect(await screen.findByText("El workspace define el contexto")).toBeInTheDocument();
  });

  it("closes the help launcher when clicking outside", async () => {
    authState.user.createdAt = new Date("2026-04-09T10:00:00.000Z");

    render(
      <GuidanceProvider>
        <DashboardContextWithAnchor />
      </GuidanceProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir centro de ayuda" }));
    expect(screen.getByText("Siguiente mejor paso")).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText("Siguiente mejor paso")).not.toBeInTheDocument();
    });
  });

  it("resolves collection guides to a concrete collection route", async () => {
    authState.user.createdAt = new Date("2026-04-09T10:00:00.000Z");

    render(
      <GuidanceProvider>
        <GuidanceActionHarness />
      </GuidanceProvider>,
    );

    await waitFor(() => {
      expect(
        preferencesState.updatePreferences.mock.calls.some(([arg]) =>
          arg.guidance?.completedMilestones?.includes("collection_created"),
        ),
      ).toBe(true);
    });

    navigationState.push.mockReset();
    fireEvent.click(screen.getByRole("button", { name: "Abrir esquema" }));

    await waitFor(() => {
      expect(navigationState.push).toHaveBeenCalledWith("/collections/collection-1?tab=fields");
    });
  });
});
