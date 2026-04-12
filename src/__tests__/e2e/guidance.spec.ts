import { expect, test } from "@playwright/test";

import { AUTH_STATE_PATH } from "@/__tests__/e2e/constants";

test.describe("guidance surfaces", () => {
  test.use({ storageState: AUTH_STATE_PATH });

  test("opens the help launcher and navigates into the help center @smoke", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Abrir centro de ayuda" }).click();
    await expect(page.getByText("Siguiente mejor paso")).toBeVisible();

    await page.getByRole("link", { name: "Abrir Help Center completo" }).click();
    await expect(
      page.getByRole("heading", { name: "Manual de uso, guías y siguientes pasos" }),
    ).toBeVisible();

    await page.getByPlaceholder("Buscar por tema, feature o problema...").fill("plantillas");
    await expect(page.getByText("Editor avanzado de plantillas")).toBeVisible();
  });
});
