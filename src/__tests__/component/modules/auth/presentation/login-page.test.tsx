import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeUser } from "@/__tests__/factories/domain-factories";
import { User } from "@/modules/auth/domain/entities/user.entity";
import LoginPage from "@/modules/auth/presentation/pages/login-page";

const loginState = vi.hoisted(() => ({
  loading: false,
  signInWithGoogle: vi.fn(),
  user: null as User | null,
}));

const navigationState = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("@/modules/auth/presentation/providers/auth-provider", () => ({
  useAuth: () => loginState,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: navigationState.replace,
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    loginState.loading = false;
    loginState.user = null;
    loginState.signInWithGoogle.mockReset();
    navigationState.replace.mockReset();
  });

  it("renders the sign-in button and delegates the action", () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByText("Continuar con Google"));

    expect(screen.getByText("Inicia Sesión")).toBeInTheDocument();
    expect(loginState.signInWithGoogle).toHaveBeenCalledOnce();
  });

  it("shows the connecting state while auth is loading", () => {
    loginState.loading = true;

    render(<LoginPage />);

    expect(screen.getByText("Conectando...")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("redirects authenticated users away from the login page", async () => {
    loginState.user = makeUser();

    render(<LoginPage />);

    await waitFor(() => {
      expect(navigationState.replace).toHaveBeenCalledWith("/");
    });
  });
});
