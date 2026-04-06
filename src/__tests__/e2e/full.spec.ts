import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { AUTH_META_PATH, AUTH_STATE_PATH } from "@/__tests__/e2e/constants";
import { createServiceRoleSupabaseClient } from "@/__tests__/helpers/supabase-harness";

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s-]+/g, "_");
}

test.describe("full collection lifecycle", () => {
  test.use({ storageState: AUTH_STATE_PATH });

  test("creates, edits, sorts, paginates and deletes collection data @full", async ({ page }) => {
    const suffix = Date.now().toString().slice(-6);
    const collectionName = `Projects ${suffix}`;
    const collectionSlug = toSlug(collectionName);
    const service = createServiceRoleSupabaseClient();
    const authMeta = JSON.parse(await readFile(AUTH_META_PATH, "utf8")) as {
      accountId: string;
    };

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
    await page.getByLabel("Title").fill("Alpha");
    await page.getByRole("button", { name: "Crear Registro" }).click();
    await expect(page.getByRole("cell", { name: "Alpha", exact: true })).toBeVisible();

    const alphaRow = page.locator("tr", { hasText: "Alpha" });
    await alphaRow.hover();
    await page
      .getByRole("button", { name: /Editar registro/ })
      .first()
      .click();
    await page.getByLabel("Title").fill("Alpha Updated");
    await page.getByRole("button", { name: "Actualizar" }).click();
    await expect(page.getByRole("cell", { name: "Alpha Updated", exact: true })).toBeVisible();

    const { data: collection, error: collectionError } = await service
      .from("collections")
      .select("id")
      .eq("account_id", authMeta.accountId)
      .eq("name", collectionSlug)
      .single();

    if (collectionError || !collection) {
      throw collectionError ?? new Error("Collection not found after creation");
    }

    const seededRecords = Array.from({ length: 30 }, (_, index) => ({
      collection_id: collection.id,
      account_id: authMeta.accountId,
      data: {
        title: `Seed ${String(index + 1).padStart(2, "0")}`,
      },
    }));

    const { error: recordSeedError } = await service.from("records").insert(seededRecords);

    if (recordSeedError) {
      throw recordSeedError;
    }

    await page.reload();
    await page.getByRole("columnheader", { name: /Title/ }).click();
    await expect(page.getByRole("cell", { name: "Alpha Updated", exact: true })).toBeVisible();

    await page.getByPlaceholder("Buscar registros...").fill("Alpha Updated");
    await expect(page.getByRole("cell", { name: "Alpha Updated", exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Filtros/ }).click();
    await page.getByRole("button", { name: "Añadir" }).first().click();
    await page.getByPlaceholder("Filtrar Title...").fill("Alpha");
    await page.keyboard.press("Enter"); // Submit filter
    await page.waitForTimeout(1000);

    const targetCell = page.getByRole("cell", { name: /Alpha Updated/ }).first();
    await expect(targetCell).toBeVisible();

    // Ensure the filter popover is closed
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // Double click to edit
    await targetCell.dblclick({ force: true });

    // The input should now be visible
    const inlineEditor = page.locator("td input").first();
    await expect(inlineEditor).toBeVisible();
    await inlineEditor.fill("Alpha Inline");
    await inlineEditor.press("Enter");

    await expect(page.getByRole("cell", { name: "Alpha Inline", exact: true })).toBeVisible();

    // Clear search and filters to restore all 30+ records and enable pagination
    await page.getByPlaceholder("Buscar registros...").fill("");
    await page.getByRole("button", { name: /Filtros/ }).click();
    await page.getByRole("button", { name: "Limpiar todo" }).click();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByText("2 / 2")).toBeVisible();

    await page.goto("/collections");
    const collectionCard = page.locator("div", { hasText: collectionName }).first();
    await collectionCard.hover();
    await page.getByLabel(`Eliminar colección ${collectionName}`).click();
    await expect(page.getByRole("heading", { name: collectionName })).toHaveCount(0);
  });
});
