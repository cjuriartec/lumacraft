import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, hasPublicSupabaseEnvMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  hasPublicSupabaseEnvMock: vi.fn(),
}));

vi.mock("@/shared/infrastructure/supabase/client", () => ({
  createClient: createClientMock,
}));

vi.mock("@/shared/infrastructure/supabase/env", () => ({
  hasPublicSupabaseEnv: hasPublicSupabaseEnvMock,
}));

import SupabaseProvider from "@/shared/presentation/providers/supabase-provider";

describe("SupabaseProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders fallback and skips client creation when public env is missing", () => {
    hasPublicSupabaseEnvMock.mockReturnValue(false);

    render(
      <SupabaseProvider fallback={<div>Configuracion faltante</div>}>
        <div>App</div>
      </SupabaseProvider>,
    );

    expect(screen.getByText("Configuracion faltante")).toBeInTheDocument();
    expect(screen.queryByText("App")).not.toBeInTheDocument();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("renders children when public env is available", () => {
    hasPublicSupabaseEnvMock.mockReturnValue(true);
    createClientMock.mockReturnValue({ auth: {}, from: vi.fn() });

    render(
      <SupabaseProvider fallback={<div>Configuracion faltante</div>}>
        <div>App</div>
      </SupabaseProvider>,
    );

    expect(screen.getByText("App")).toBeInTheDocument();
    expect(screen.queryByText("Configuracion faltante")).not.toBeInTheDocument();
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });

  it("prefers an injected client over environment checks", () => {
    const injectedClient = { auth: {}, from: vi.fn() };
    hasPublicSupabaseEnvMock.mockReturnValue(false);

    render(
      <SupabaseProvider client={injectedClient as never}>
        <div>App</div>
      </SupabaseProvider>,
    );

    expect(screen.getByText("App")).toBeInTheDocument();
    expect(createClientMock).not.toHaveBeenCalled();
  });
});
