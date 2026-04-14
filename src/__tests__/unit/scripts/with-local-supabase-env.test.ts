import { describe, expect, it } from "vitest";

import { resolveCommand } from "../../../../scripts/with-local-supabase-env.mjs";

describe("with-local-supabase-env", () => {
  it("resolves direct Playwright invocations through npx", () => {
    expect(resolveCommand("playwright", ["test", "--project", "full"])).toEqual({
      command: process.platform === "win32" ? "npx.cmd" : "npx",
      args: ["playwright", "test", "--project", "full"],
    });
  });

  it("preserves non-Playwright commands", () => {
    expect(resolveCommand("vitest", ["run", "--project", "unit"])).toEqual({
      command: "vitest",
      args: ["run", "--project", "unit"],
    });
  });
});
