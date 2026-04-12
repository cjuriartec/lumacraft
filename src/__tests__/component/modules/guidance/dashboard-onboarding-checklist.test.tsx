import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardOnboardingChecklist } from "@/modules/guidance/presentation/components/dashboard-onboarding-checklist";

const guidanceState = vi.hoisted(() => ({
  checklistItems: [
    {
      id: "navigation",
      title: "Entender workspace y navegación",
      description: "Guía inicial",
      milestoneId: "navigation_understood",
      guideId: "dashboard-overview",
      articleId: "primeros-pasos",
      completed: false,
      current: true,
      locked: false,
    },
    {
      id: "ai-setup",
      title: "Configurar la IA del workspace",
      description: "Paso previo",
      milestoneId: "ai_configured",
      guideId: "ai-settings-overview",
      articleId: "configuracion-ia",
      completed: false,
      current: false,
      locked: true,
    },
  ],
  startGuide: vi.fn(),
  openHelpArticle: vi.fn(),
}));

vi.mock("@/modules/guidance/presentation/hooks/use-guidance", () => ({
  useGuidance: () => guidanceState,
}));

describe("DashboardOnboardingChecklist", () => {
  beforeEach(() => {
    guidanceState.startGuide.mockReset();
    guidanceState.openHelpArticle.mockReset();
  });

  it("renders checklist progress and delegates guide/manual actions", () => {
    render(<DashboardOnboardingChecklist />);

    expect(screen.getByText("Primer recorrido sugerido")).toBeInTheDocument();
    expect(screen.getByText("0 / 2 completados")).toBeInTheDocument();
    expect(screen.getByText("Paso actual")).toBeInTheDocument();
    expect(screen.getByText("Se desbloquea al completar el paso anterior")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Abrir guía"));
    fireEvent.click(screen.getByText("Manual"));

    expect(guidanceState.startGuide).toHaveBeenCalledWith("dashboard-overview");
    expect(guidanceState.openHelpArticle).toHaveBeenCalledWith("primeros-pasos");
  });
});
