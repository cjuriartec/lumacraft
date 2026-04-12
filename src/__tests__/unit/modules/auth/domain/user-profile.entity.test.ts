import { describe, expect, it } from "vitest";

import { UserProfile } from "@/modules/auth/domain/entities/user-profile.entity";

describe("UserProfile Entity", () => {
  it("creates a user profile with default preferences", () => {
    const result = UserProfile.create({ id: "user-1" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const profile = result.value;
      expect(profile.id).toBe("user-1");
      expect(profile.preferences.sidebarCollapsed).toBe(true);
      expect(profile.preferences.theme).toBe("system");
    }
  });

  it("merges provided preferences with defaults", () => {
    const result = UserProfile.create({
      id: "user-1",
      preferences: {
        sidebarCollapsed: false,
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const profile = result.value;
      expect(profile.preferences.sidebarCollapsed).toBe(false);
      expect(profile.preferences.theme).toBe("system");
    }
  });

  it("updates preferences correctly", () => {
    const profileRes = UserProfile.create({ id: "user-1" });
    if (!profileRes.ok) throw profileRes.error;
    const profile = profileRes.value;

    profile.updatePreferences({ theme: "dark" });

    expect(profile.preferences.theme).toBe("dark");
    expect(profile.preferences.sidebarCollapsed).toBe(true); // preserved
  });
});
