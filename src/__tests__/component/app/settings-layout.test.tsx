import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const routerState = vi.hoisted(() => ({
  replace: vi.fn(),
}));

const accessState = vi.hoisted(() => ({
  canAccessSettings: true,
  loading: false,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerState,
}));

vi.mock("@/modules/workspace/presentation/hooks/use-workspace-access", () => ({
  useWorkspaceAccess: () => accessState,
}));

import SettingsLayout from "@/app/(dashboard)/settings/layout";

describe("SettingsLayout", () => {
  it("renders settings children for authorized users", () => {
    accessState.canAccessSettings = true;
    accessState.loading = false;

    render(
      <SettingsLayout>
        <div>contenido settings</div>
      </SettingsLayout>,
    );

    expect(screen.getByText("contenido settings")).toBeInTheDocument();
  });

  it("redirects unauthorized users away from settings", async () => {
    accessState.canAccessSettings = false;
    accessState.loading = false;
    routerState.replace.mockReset();

    render(
      <SettingsLayout>
        <div>contenido settings</div>
      </SettingsLayout>,
    );

    await waitFor(() => {
      expect(routerState.replace).toHaveBeenCalledWith("/");
    });
    expect(screen.queryByText("contenido settings")).not.toBeInTheDocument();
  });

  it("keeps showing a loading shell while workspace access is resolving", () => {
    accessState.canAccessSettings = false;
    accessState.loading = true;

    const { container } = render(
      <SettingsLayout>
        <div>contenido settings</div>
      </SettingsLayout>,
    );

    expect(container.firstChild).toHaveClass("animate-pulse");
  });
});
