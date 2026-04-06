import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccountAISettingsDto } from "@/modules/ai/application/types/account-ai-settings.dto";
import AccountAISettingsPage from "@/modules/ai/presentation/pages/account-ai-settings-page";

const hookState = vi.hoisted(() => ({
  settings: null as AccountAISettingsDto | null,
  loading: false,
  saving: false,
  error: null as string | null,
  save: vi.fn(),
}));

const workspaceState = vi.hoisted(() => ({
  currentWorkspace: {
    id: "workspace-1",
    name: "Workspace Demo",
  } as { id: string; name: string } | null,
}));

const permissionState = vi.hoisted(() => ({
  isOwner: true,
  isSuperAdmin: false,
}));

vi.mock("@/modules/ai/presentation/hooks/use-account-ai-settings", () => ({
  useAccountAISettings: () => ({
    settings: hookState.settings,
    loading: hookState.loading,
    saving: hookState.saving,
    error: hookState.error,
    refresh: vi.fn(),
    save: hookState.save,
    testConnection: vi.fn(),
  }),
}));

vi.mock("@/modules/workspace/presentation/providers/workspace-provider", () => ({
  useWorkspace: () => workspaceState,
}));

vi.mock("@/modules/authorization/presentation/providers/permission-provider", () => ({
  usePermissions: () => permissionState,
}));

vi.mock("@/shared/presentation/providers/breadcrumb-provider", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("AccountAISettingsPage", () => {
  beforeEach(() => {
    hookState.loading = false;
    hookState.saving = false;
    hookState.error = null;
    hookState.save.mockReset();
    hookState.save.mockResolvedValue(undefined);
    workspaceState.currentWorkspace = {
      id: "workspace-1",
      name: "Workspace Demo",
    };
    permissionState.isOwner = true;
    permissionState.isSuperAdmin = false;
    hookState.settings = {
      accountId: "workspace-1",
      defaultProvider: "GEMINI",
      defaultModel: "gemini-2.5-flash",
      defaultTemperature: 0.3,
      defaultMaxTokens: 512,
      requestTimeoutMs: 25000,
      featureTemplateAI: true,
      featureTemplateLogic: true,
      templatePreviewTimeoutMs: 45000,
      templatePreviewMaxAIBlocks: 3,
      systemPrompt: "Enfoca la respuesta en contratos.",
      providerOptions: {
        GEMINI: {
          allowedModels: ["gemini-2.5-flash", "gemini-2.5-pro"],
        },
        OPENAI: {
          allowedModels: ["gpt-5.4-mini"],
        },
        ANTHROPIC: {
          allowedModels: ["claude-3-7-sonnet"],
        },
      },
      providerSecrets: {
        GEMINI: {
          isConfigured: true,
          last4: "1234",
          updatedAt: "2026-04-05T12:00:00.000Z",
        },
        OPENAI: {
          isConfigured: false,
          last4: null,
          updatedAt: null,
        },
        ANTHROPIC: {
          isConfigured: false,
          last4: null,
          updatedAt: null,
        },
      },
    };
  });

  it("shows masked provider secret metadata without prefilling the input", async () => {
    render(<AccountAISettingsPage />);

    expect(await screen.findByText("Terminada en 1234")).toBeInTheDocument();
    const passwordInputs = await screen.findAllByPlaceholderText(/key/i);
    expect((passwordInputs[0] as HTMLInputElement).value).toBe("");
  });

  it("submits write-only secret updates together with the current draft", async () => {
    render(<AccountAISettingsPage />);

    const passwordInputs = await screen.findAllByPlaceholderText(/key/i);
    fireEvent.change(passwordInputs[0], {
      target: { value: "nueva-key-9999" },
    });

    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(hookState.save).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultProvider: "GEMINI",
          defaultModel: "gemini-2.5-flash",
          providerSecretsInput: {
            GEMINI: "nueva-key-9999",
          },
        }),
      );
    });
  });

  it("blocks access for non-admin users", () => {
    permissionState.isOwner = false;
    permissionState.isSuperAdmin = false;

    render(<AccountAISettingsPage />);

    expect(
      screen.getByText("Solo el owner o un admin del workspace puede editar esta configuración."),
    ).toBeInTheDocument();
  });
});
