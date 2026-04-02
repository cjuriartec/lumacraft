import { describe, expect, it, vi } from "vitest";

const callbackMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/shared/infrastructure/supabase/server", () => ({
  createClient: callbackMocks.createClient,
}));

import { GET } from "@/app/auth/callback/route";

describe("auth callback route", () => {
  it("redirects to the requested path when the auth code is exchanged successfully", async () => {
    callbackMocks.createClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      },
    });

    const response = await GET(
      new Request("https://lumacraft.local/auth/callback?code=abc123&next=%2Fcollections"),
    );

    expect(response.headers.get("location")).toBe("https://lumacraft.local/collections");
  });

  it("redirects back to login when the exchange fails", async () => {
    callbackMocks.createClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: new Error("invalid code") }),
      },
    });

    const response = await GET(new Request("https://lumacraft.local/auth/callback?code=abc123"));

    expect(response.headers.get("location")).toBe(
      "https://lumacraft.local/login?error=Could%20not%20authenticate",
    );
  });
});
