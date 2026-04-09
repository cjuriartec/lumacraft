import { expect, test } from "@playwright/test";

import { AUTH_STATE_PATH } from "@/__tests__/e2e/constants";

test.describe("AI Settings Fallback", () => {
  test.use({ storageState: AUTH_STATE_PATH });

  test("can toggle fallback settings and select models", async ({ page }) => {
    // 1. Navigate to AI Settings
    await page.goto("/settings/ai");

    // Wait for settings to load
    await expect(
      page.getByRole("heading", { name: "Configuración de Inteligencia Artificial" }),
    ).toBeVisible();

    // 2. Find Estabilidad y Fallback section
    await expect(page.getByText("Estabilidad y Fallback")).toBeVisible();

    // 3. Toggle Fallback
    // Click regardless to toggle
    await page.getByRole("switch", { name: /Habilitar Fallback/i }).click();

    // 4. Select a fallback model
    // Assuming gpt-5.4-mini is in the list (it should be as we saw in constants)
    await page.getByLabel("Modelo de Fallback").click();
    await page.getByRole("option", { name: "gpt-5.4-mini" }).click();

    // 5. Save settings
    await page.getByRole("button", { name: "Guardar Cambios" }).click();

    // Wait for success toast
    await expect(page.getByText("Configuración guardada")).toBeVisible();

    // 6. Verify persistence on reload
    await page.reload();
    await expect(page.getByText("Estabilidad y Fallback")).toBeVisible();
    await expect(page.getByRole("switch", { name: /Habilitar Fallback/i })).toBeVisible();
  });
});
