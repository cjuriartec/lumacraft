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

vi.mock("@/shared/lib/current-workspace-selection.server", () => ({
  matchesCurrentWorkspaceSelection: serverMocks.matchesCurrentWorkspaceSelection,
}));

vi.mock("next/navigation", () => ({
  redirect: serverMocks.redirect,
}));

vi.mock("@/modules/template/presentation/pages/template-editor-page", () => ({
  __esModule: true,
  default: () => <div>template-editor-page</div>,
}));

import Page from "@/app/(dashboard)/collections/[id]/templates/[templateId]/page";

describe("dashboard collection template entrypoint", () => {
  it("redirects to collections when the collection is outside the active workspace", async () => {
    serverMocks.matchesCurrentWorkspaceSelection.mockResolvedValue(false);
    serverMocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "collections") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    account_id: "workspace-2",
                  },
                }),
              }),
            }),
          };
        }

        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      }),
    });

    await expect(
      Page({ params: Promise.resolve({ id: "collection-1", templateId: "template-1" }) }),
    ).rejects.toThrow("redirect:/collections");
  });
});
