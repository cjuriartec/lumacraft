import { expect, test } from "@playwright/test";

import { AUTH_STATE_PATH } from "@/__tests__/e2e/constants";

test("redirects anonymous users to the login screen @smoke", async ({ page }) => {
  await page.goto("/collections");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Inicia Sesión")).toBeVisible();
});

test.describe("authenticated smoke flows", () => {
  test.use({ storageState: AUTH_STATE_PATH });

  test("loads the dashboard and creates a collection with its first field and record @smoke", async ({
    page,
  }) => {
    const suffix = Date.now().toString().slice(-6);
    const collectionName = `Smoke ${suffix}`;

    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Hola,/ })).toBeVisible();

    await page.goto("/collections");
    await page.getByRole("button", { name: "Nueva Colección" }).first().click();
    await page.getByPlaceholder("ej: Portafolio de Proyectos").fill(collectionName);
    await page.getByRole("button", { name: "Crear Colección" }).click();

    await expect(page.getByRole("heading", { name: collectionName })).toBeVisible();
    await page.getByRole("link", { name: "Ver Datos" }).first().click();

    await page.getByRole("tab", { name: /Esquema/ }).click();
    await page.getByRole("button", { name: "Añadir Campo" }).click();
    await page.getByLabel("Nombre Visible").fill("Title");
    await page.getByRole("button", { name: "Crear Campo" }).click();
    await expect(page.getByRole("cell", { name: "Title", exact: true })).toBeVisible();

    await page.getByRole("tab", { name: /Datos/ }).click();
    await page.getByRole("button", { name: "Nuevo Registro" }).click();
    await page.getByLabel("Title").fill("Smoke Record");
    await page.getByRole("button", { name: "Crear Registro" }).click();

    await expect(page.getByRole("cell", { name: "Smoke Record", exact: true })).toBeVisible();
  });
});
