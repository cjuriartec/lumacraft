import { describe, expect, it, vi } from "vitest";

const serverMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  resolveDocumentRouteContext: vi.fn(),
}));

vi.mock("@/shared/infrastructure/supabase/server", () => ({
  createClient: serverMocks.createClient,
}));

vi.mock("next/navigation", () => ({
  redirect: serverMocks.redirect,
}));

vi.mock("@/modules/document/infrastructure/document-server", () => ({
  resolveDocumentRouteContext: serverMocks.resolveDocumentRouteContext,
}));

vi.mock("@/modules/document/presentation/pages/record-document-editor-page", () => ({
  __esModule: true,
  default: () => <div>record-document-editor-page</div>,
}));

import Page from "@/app/(dashboard)/collections/[id]/records/[recordId]/documents/[templateId]/page";

describe("dashboard record document entrypoint", () => {
  it("redirects to collections when the collection is outside the active workspace", async () => {
    serverMocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
    });
    serverMocks.resolveDocumentRouteContext.mockResolvedValue({
      ok: false,
      error: {
        code: "WORKSPACE_COLLECTION_MISMATCH",
      },
    });

    await expect(
      Page({
        params: Promise.resolve({
          id: "collection-1",
          recordId: "record-1",
          templateId: "template-1",
        }),
      }),
    ).rejects.toThrow("redirect:/collections");
  });
});
