import { expect, test } from "@playwright/test";

import { AUTH_STATE_PATH } from "@/__tests__/e2e/constants";

test.describe("Record Detail", () => {
  test.use({ storageState: AUTH_STATE_PATH });

  test("opens the read-only record page from the eye action", async ({ page }) => {
    await page.goto("/collections");

    const collectionLink = page.getByRole("link", { name: "Ver Datos" }).first();
    await collectionLink.waitFor({ state: "visible" });
    await collectionLink.click();

    const firstRow = page.locator("tbody tr").first();
    await firstRow.hover();
    await firstRow.getByRole("link", { name: /Ver registro/i }).click();

    await expect(page).toHaveURL(/\/collections\/.+\/records\/.+$/);
    await expect(page.getByRole("link", { name: /Volver a la colección/i })).toBeVisible();
  });
});
