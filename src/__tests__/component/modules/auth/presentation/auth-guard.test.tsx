import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { makeUser } from "@/__tests__/factories/domain-factories";
import { FakeAuthProvider, InMemoryWorkspaceRepository } from "@/__tests__/helpers/fakes";
import { renderWithProviders } from "@/__tests__/helpers/render-with-providers";
import AuthGuard from "@/modules/auth/presentation/components/auth-guard";

const navigationState = vi.hoisted(() => ({
  pathname: "/collections",
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
  useRouter: () => ({
    push: navigationState.push,
  }),
}));

describe("AuthGuard", () => {
  it("redirects unauthenticated users outside the login route", async () => {
    const authProvider = new FakeAuthProvider();
    navigationState.pathname = "/collections";
    navigationState.push.mockReset();

    renderWithProviders(
      <AuthGuard>
        <div>Secret</div>
      </AuthGuard>,
      {
        authService: authProvider,
        workspaceRepository: new InMemoryWorkspaceRepository(),
      },
    );

    await waitFor(() => {
      expect(navigationState.push).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
  });

  it("allows the login page to render for anonymous users", async () => {
    const authProvider = new FakeAuthProvider();
    navigationState.pathname = "/login";
    navigationState.push.mockReset();

    renderWithProviders(
      <AuthGuard>
        <div>Login</div>
      </AuthGuard>,
      {
        authService: authProvider,
        workspaceRepository: new InMemoryWorkspaceRepository(),
      },
    );

    expect(await screen.findByText("Login")).toBeInTheDocument();
    expect(navigationState.push).not.toHaveBeenCalled();
  });

  it("renders protected content for authenticated users", async () => {
    const authProvider = new FakeAuthProvider();
    authProvider.currentUserResult = { ok: true, value: makeUser() };
    navigationState.pathname = "/collections";
    navigationState.push.mockReset();

    renderWithProviders(
      <AuthGuard>
        <div>Secret</div>
      </AuthGuard>,
      {
        authService: authProvider,
        workspaceRepository: new InMemoryWorkspaceRepository(),
      },
    );

    expect(await screen.findByText("Secret")).toBeInTheDocument();
    expect(navigationState.push).not.toHaveBeenCalled();
  });
});
