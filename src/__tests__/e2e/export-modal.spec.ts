import { expect, test } from "@playwright/test";

import { AUTH_STATE_PATH } from "@/__tests__/e2e/constants";

test.describe("Record Document Selector", () => {
  test.use({ storageState: AUTH_STATE_PATH });

  test("opens the document selector from the eye action without legacy export format tabs", async ({
    page,
  }) => {
    await page.goto("/collections");

    const collectionLink = page.getByRole("link", { name: "Ver Datos" }).first();
    await collectionLink.waitFor({ state: "visible" });
    await collectionLink.click();

    await page
      .getByRole("button", { name: /Abrir documento del registro/i })
      .first()
      .click();

    await expect(page.getByText("Abrir Documento")).toBeVisible();
    await expect(page.getByText("Documento persistido por plantilla")).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("tab")).toHaveCount(0);
  });
});
