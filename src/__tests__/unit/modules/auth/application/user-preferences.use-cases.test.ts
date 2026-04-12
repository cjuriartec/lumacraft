import { describe, expect, it } from "vitest";

import { InMemoryUserProfileRepository } from "@/__tests__/helpers/fakes";
import { GetUserPreferencesUseCase } from "@/modules/auth/application/use-cases/get-user-preferences.use-case";
import { UpdateUserPreferencesUseCase } from "@/modules/auth/application/use-cases/update-user-preferences.use-case";
import { UserProfile } from "@/modules/auth/domain/entities/user-profile.entity";

describe("User Preferences Use Cases", () => {
  it("GetUserPreferencesUseCase returns the profile preferences from repository", async () => {
    const userId = "user-123";
    const profileRes = UserProfile.create({
      id: userId,
      preferences: { theme: "dark", sidebarCollapsed: false },
    });
    if (!profileRes.ok) throw profileRes.error;
    const profile = profileRes.value;

    const repo = new InMemoryUserProfileRepository([profile]);
    const useCase = new GetUserPreferencesUseCase(repo);

    const result = await useCase.execute(userId);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.theme).toBe("dark");
      expect(result.value.sidebarCollapsed).toBe(false);
    }
  });

  it("UpdateUserPreferencesUseCase updates and saves the profile", async () => {
    const userId = "user-123";
    const profileRes = UserProfile.create({ id: userId });
    if (!profileRes.ok) throw profileRes.error;
    const profile = profileRes.value;
    const repo = new InMemoryUserProfileRepository([profile]);
    const useCase = new UpdateUserPreferencesUseCase(repo);

    const result = await useCase.execute(userId, { theme: "light", sidebarCollapsed: false });

    expect(result.ok).toBe(true);
    expect(repo.save).toHaveBeenCalledOnce();

    const updated = await repo.findById(userId);
    if (updated.ok) {
      expect(updated.value.preferences.theme).toBe("light");
      expect(updated.value.preferences.sidebarCollapsed).toBe(false);
    }
  });
});
