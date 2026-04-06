"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { vi } from "vitest";

import type { IAuthProvider } from "@/modules/auth/domain/ports/auth-provider.port";
import AuthProvider from "@/modules/auth/presentation/providers/auth-provider";
import type { IWorkspaceRepository } from "@/modules/workspace/domain/ports/workspace-repository.port";
import WorkspaceProvider from "@/modules/workspace/presentation/providers/workspace-provider";
import SupabaseProvider from "@/shared/presentation/providers/supabase-provider";
import { ThemeProvider } from "@/shared/presentation/providers/theme-provider";

function createSupabaseClientMock() {
  return {
    from: vi.fn(),
    auth: {
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  } as unknown as SupabaseClient;
}

interface RenderWithProvidersOptions {
  authService?: IAuthProvider;
  workspaceRepository?: IWorkspaceRepository;
  supabaseClient?: SupabaseClient;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    authService,
    workspaceRepository,
    supabaseClient = createSupabaseClientMock(),
  }: RenderWithProvidersOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <SupabaseProvider client={supabaseClient}>
          <AuthProvider authService={authService}>
            <WorkspaceProvider workspaceRepository={workspaceRepository}>
              {children}
            </WorkspaceProvider>
          </AuthProvider>
        </SupabaseProvider>
      </ThemeProvider>
    );
  }

  return render(ui, { wrapper: Wrapper });
}
