import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useCollectionWorkspaceGuard } from "@/modules/collection/presentation/hooks/use-collection-workspace-guard";

const workspaceState = vi.hoisted(() => ({
  currentWorkspace: { id: "workspace-1" } as { id: string } | null,
  loading: false,
}));

const navigationState = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("@/modules/workspace/presentation/providers/workspace-provider", () => ({
  useWorkspace: () => workspaceState,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: navigationState.replace,
  }),
}));

function GuardProbe({ collectionAccountId }: { collectionAccountId?: string | null }) {
  const isWorkspaceMismatch = useCollectionWorkspaceGuard(collectionAccountId);
  return <span>{isWorkspaceMismatch ? "blocked" : "visible"}</span>;
}

describe("useCollectionWorkspaceGuard", () => {
  it("keeps the route visible when the active workspace matches the collection", () => {
    workspaceState.currentWorkspace = { id: "workspace-1" };
    navigationState.replace.mockReset();

    render(<GuardProbe collectionAccountId="workspace-1" />);

    expect(screen.getByText("visible")).toBeInTheDocument();
    expect(navigationState.replace).not.toHaveBeenCalled();
  });

  it("redirects to collections when the active workspace changes", async () => {
    workspaceState.currentWorkspace = { id: "workspace-1" };
    navigationState.replace.mockReset();

    const { rerender } = render(<GuardProbe collectionAccountId="workspace-1" />);

    workspaceState.currentWorkspace = { id: "workspace-2" };
    rerender(<GuardProbe collectionAccountId="workspace-1" />);

    await waitFor(() => {
      expect(navigationState.replace).toHaveBeenCalledWith("/collections");
    });
    expect(screen.getByText("blocked")).toBeInTheDocument();
  });
});
