import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const serverMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  matchesCurrentWorkspaceSelection: vi.fn(async () => true),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("@/shared/infrastructure/supabase/server", () => ({
  createClient: serverMocks.createClient,
}));

vi.mock("next/navigation", () => ({
  redirect: serverMocks.redirect,
}));

vi.mock("@/shared/lib/current-workspace-selection.server", () => ({
  matchesCurrentWorkspaceSelection: serverMocks.matchesCurrentWorkspaceSelection,
}));

vi.mock("@/modules/collection/presentation/pages/collection-detail-page", () => ({
  CollectionDetailPage: ({
    collectionId,
    collectionName,
  }: {
    collectionId: string;
    collectionName: string;
  }) => <div>{`${collectionId}:${collectionName}`}</div>,
}));

import Page from "@/app/(dashboard)/collections/[id]/page";

describe("dashboard collection detail entrypoint", () => {
  it("redirects to login when there is no active session", async () => {
    serverMocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    await expect(Page({ params: Promise.resolve({ id: "collection-1" }) })).rejects.toThrow(
      "redirect:/login",
    );
  });

  it("redirects to collections when the collection does not exist", async () => {
    serverMocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    });

    await expect(Page({ params: Promise.resolve({ id: "collection-1" }) })).rejects.toThrow(
      "redirect:/collections",
    );
  });

  it("renders the collection detail page with fetched display data", async () => {
    serverMocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                name: "projects",
                display_name: "Projects",
                account_id: "workspace-1",
              },
            }),
          }),
        }),
      }),
    });

    const page = await Page({ params: Promise.resolve({ id: "collection-1" }) });

    render(page);

    expect(screen.getByText("collection-1:Projects")).toBeInTheDocument();
  });

  it("redirects to collections when the collection is outside the active workspace", async () => {
    serverMocks.matchesCurrentWorkspaceSelection.mockResolvedValue(false);
    serverMocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                name: "projects",
                display_name: "Projects",
                account_id: "workspace-2",
              },
            }),
          }),
        }),
      }),
    });

    await expect(Page({ params: Promise.resolve({ id: "collection-1" }) })).rejects.toThrow(
      "redirect:/collections",
    );
  });
});
