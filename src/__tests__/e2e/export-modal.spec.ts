import { expect, test } from "@playwright/test";

import { AUTH_STATE_PATH } from "@/__tests__/e2e/constants";

test.describe("Export Record Modal", () => {
  test.use({ storageState: AUTH_STATE_PATH });

  test("locks the modal during export and shows construction state", async ({ page }) => {
    // 1. Navigate to a collection's data page
    // Using a sample collection ID from the smoke test patterns
    await page.goto("/collections");

    // Wait for any collection to be visible
    const collectionLink = page.getByRole("link", { name: "Ver Datos" }).first();
    await collectionLink.waitFor({ state: "visible" });
    await collectionLink.click();

    // 2. Open Export Modal
    await page.getByRole("button", { name: /Exportar/i }).click();
    await expect(page.getByText("Exportar Registro")).toBeVisible();

    // 3. Selection View (Minimalist)
    // Check for PDF/DOCX tabs
    await expect(page.getByRole("tab", { name: "PDF" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "DOCX" })).toBeVisible();

    // 4. Trigger Export
    await page.getByRole("button", { name: "Exportar como PDF" }).click();

    // 5. Build/Construction View
    // The button should show "Construyendo..." and the modal should be locked
    await expect(page.getByText("Construyendo...")).toBeVisible();

    // Attempting to close with Escape should be prevented (we can't easily test the 'lack' of closing without a timeout)
    await page.keyboard.press("Escape");
    await expect(page.getByText("Exportar Registro")).toBeVisible(); // Still there

    // 6. Success View (Eventually)
    // We mock the API delay if possible, but in E2E we wait for success
    await expect(page.getByText("Listo para descargar")).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole("button", { name: "Descargar" })).toBeVisible();
  });
});
