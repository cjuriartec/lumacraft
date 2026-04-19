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
      expect(profile.fullName).toBeUndefined();
      expect(profile.avatarUrl).toBeUndefined();
    }
  });

  it("should create a profile with full name and avatar", () => {
    const profileRes = UserProfile.create({
      id: "user-1",
      fullName: "John Doe",
      avatarUrl: "https://example.com/avatar.png",
    });
    if (!profileRes.ok) throw profileRes.error;
    const profile = profileRes.value;

    expect(profile.fullName).toBe("John Doe");
    expect(profile.avatarUrl).toBe("https://example.com/avatar.png");
  });

  it("should update profile info via updateProfile method", () => {
    const profileRes = UserProfile.create({ id: "user-1" });
    if (!profileRes.ok) throw profileRes.error;
    const profile = profileRes.value;

    profile.updateProfile({
      fullName: "Jane Doe",
      avatarUrl: "https://example.com/jane.png",
    });

    expect(profile.fullName).toBe("Jane Doe");
    expect(profile.avatarUrl).toBe("https://example.com/jane.png");
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

  it("merges guidance preferences deeply instead of replacing them", () => {
    const profileRes = UserProfile.create({
      id: "user-1",
      preferences: {
        guidance: {
          completedMilestones: ["collection_created"],
          completedGuideIds: ["dashboard-overview"],
          dismissedGuideIds: [],
          viewedArticleIds: ["primeros-pasos"],
          existingUserNudgeDismissed: false,
        },
      },
    });
    if (!profileRes.ok) throw profileRes.error;
    const profile = profileRes.value;

    profile.updatePreferences({
      guidance: {
        completedMilestones: ["field_created"],
        completedGuideIds: [],
        dismissedGuideIds: ["collections-overview"],
        viewedArticleIds: [],
        existingUserNudgeDismissed: true,
      },
    });

    expect(profile.preferences.guidance?.completedMilestones).toEqual([
      "collection_created",
      "field_created",
    ]);
    expect(profile.preferences.guidance?.completedGuideIds).toEqual(["dashboard-overview"]);
    expect(profile.preferences.guidance?.dismissedGuideIds).toEqual(["collections-overview"]);
    expect(profile.preferences.guidance?.viewedArticleIds).toEqual(["primeros-pasos"]);
    expect(profile.preferences.guidance?.existingUserNudgeDismissed).toBe(true);
  });
});
