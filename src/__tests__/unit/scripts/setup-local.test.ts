import { describe, expect, it, vi } from "vitest";

import { canReuseRunningSupabase, parseStatusEnv } from "../../../../scripts/setup-local.mjs";

describe("setup-local script helpers", () => {
  it("parses env output and ignores non-env lines", () => {
    const env = parseStatusEnv(`
Stopped services: [supabase_imgproxy_lumacraft]
API_URL="http://127.0.0.1:54321"
ANON_KEY="anon"
`);

    expect(env).toEqual({
      API_URL: "http://127.0.0.1:54321",
      ANON_KEY: "anon",
    });
  });

  it("parses SECRET_KEY for admin access", () => {
    const env = parseStatusEnv(`
SECRET_KEY="sb_secret_123"
SERVICE_ROLE_KEY="jwt_secret"
`) as Record<string, string>;

    expect(env.SECRET_KEY).toBe("sb_secret_123");
    expect(env.SERVICE_ROLE_KEY).toBe("jwt_secret");
  });

  it("does not reuse Supabase when API_URL is missing", async () => {
    await expect(canReuseRunningSupabase(null)).resolves.toBe(false);
  });

  it("reuses a running stack by checking only the auth health endpoint", async () => {
    const checker = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    await expect(
      canReuseRunningSupabase({ API_URL: "http://127.0.0.1:54321" }, checker),
    ).resolves.toBe(true);

    expect(checker).toHaveBeenCalledTimes(1);
    expect(checker).toHaveBeenCalledWith("http://127.0.0.1:54321/auth/v1/health");
  });

  it("starts Supabase again when auth health is not ready", async () => {
    const checker = vi.fn().mockResolvedValue({ ok: false, status: 503 });

    await expect(
      canReuseRunningSupabase({ API_URL: "http://127.0.0.1:54321" }, checker),
    ).resolves.toBe(false);
  });
});
