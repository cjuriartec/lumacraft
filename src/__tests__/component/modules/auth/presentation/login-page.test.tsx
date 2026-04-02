import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginPage from "@/modules/auth/presentation/pages/login-page";

const loginState = vi.hoisted(() => ({
  loading: false,
  signInWithGoogle: vi.fn(),
}));

vi.mock("@/modules/auth/presentation/providers/auth-provider", () => ({
  useAuth: () => loginState,
}));

describe("LoginPage", () => {
  beforeEach(() => {
    loginState.loading = false;
    loginState.signInWithGoogle.mockReset();
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
});
