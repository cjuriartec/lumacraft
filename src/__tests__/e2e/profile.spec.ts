import { expect, test } from "@playwright/test";
import path from "path";

import { AUTH_STATE_PATH } from "@/__tests__/e2e/constants";

test.describe("Profile Management", () => {
  test.use({ storageState: AUTH_STATE_PATH });

  test("can update full name and upload a new avatar @profile", async ({ page }) => {
    await page.goto("/profile");

    // 1. Verify initial state
    await expect(page.getByRole("heading", { name: "Tu Foto de Perfil" })).toBeVisible();

    // 2. Change name
    const newName = `Test User ${Date.now()}`;
    const nameInput = page.getByLabel("Nombre Completo");
    await nameInput.fill(newName);

    // 3. Select a new avatar file
    const fileChooserPromise = page.waitForEvent("filechooser");
    // We click the avatar container (or the hidden input if we can force it)
    await page.getByLabel("Seleccionar avatar").click({ force: true });
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, "../factories/assets/avatar.png"));

    // 4. Submit
    await page.getByRole("button", { name: "Guardar Cambios" }).click();

    // 5. Verify success toast
    await expect(page.getByText("Perfil actualizado")).toBeVisible();

    // 6. Refresh and verify persistence
    await page.reload();
    await expect(page.getByLabel("Nombre Completo")).toHaveValue(newName);

    // The avatar image should now have a Supabase storage URL
    const avatarImg = page.locator('img[alt="' + newName + '"]');
    await expect(avatarImg).toHaveAttribute("src", /storage\/v1\/object\/public\/avatars/);
  });
});
