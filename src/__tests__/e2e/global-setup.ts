import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium, type FullConfig } from "@playwright/test";

import { AUTH_META_PATH, AUTH_STATE_PATH } from "@/__tests__/e2e/constants";
import { createTestUser, getPersonalAccountId } from "@/__tests__/helpers/supabase-harness";

async function waitForServer(baseURL: string) {
  const timeoutMs = 60_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(baseURL);
      if (response.ok || response.status < 500) {
        return;
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Timed out waiting for ${baseURL}`);
}

export default async function globalSetup(config: FullConfig) {
  const configuredBaseURL =
    config.projects
      .map((project) => project.use.baseURL)
      .find((baseURL): baseURL is string => typeof baseURL === "string") ?? "http://127.0.0.1:3000";

  await mkdir(path.dirname(AUTH_STATE_PATH), { recursive: true });
  await waitForServer(configuredBaseURL);

  const user = await createTestUser("e2e");
  const accountId = await getPersonalAccountId(user.id);

  await writeFile(
    AUTH_META_PATH,
    JSON.stringify(
      {
        userId: user.id,
        accountId,
        email: user.email,
        password: user.password,
      },
      null,
      2,
    ),
  );

  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: configuredBaseURL,
  });
  const page = await context.newPage();

  await page.goto("/login");
  const login = await page.evaluate(
    async ({ email, password }) => {
      const response = await fetch("/api/test-auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      return {
        ok: response.ok,
        body: await response.json(),
      };
    },
    {
      email: user.email,
      password: user.password,
    },
  );

  if (!login.ok) {
    throw new Error(`Unable to authenticate E2E user: ${JSON.stringify(login.body)}`);
  }

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await context.storageState({ path: AUTH_STATE_PATH });
  await browser.close();
}
