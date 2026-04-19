import { describe, expect, it } from "vitest";

import { FakeAuthProvider, InMemoryUserProfileRepository } from "@/__tests__/helpers/fakes";
import { UpdateProfileUseCase } from "@/modules/auth/application/use-cases/update-profile.use-case";
import { UserProfile } from "@/modules/auth/domain/entities/user-profile.entity";
import { DomainError } from "@/shared/domain/result";

describe("UpdateProfileUseCase", () => {
  it("should update profile in repository and auth provider", async () => {
    const authProvider = new FakeAuthProvider();
    const profileRepo = new InMemoryUserProfileRepository();
    const useCase = new UpdateProfileUseCase(authProvider, profileRepo);

    const userId = "user-123";
    const props = {
      fullName: "Updated Name",
      avatarUrl: "https://example.com/avatar.png",
    };

    const result = await useCase.execute(userId, props);

    expect(result.ok).toBe(true);

    // Verify Repository update
    expect(profileRepo.findById).toHaveBeenCalledWith(userId);
    expect(profileRepo.save).toHaveBeenCalled();
    const savedProfile = (profileRepo.save.mock.calls[0][0] as UserProfile).toJSON();
    expect(savedProfile.fullName).toBe(props.fullName);
    expect(savedProfile.avatarUrl).toBe(props.avatarUrl);

    // Verify Auth Provider update
    expect(authProvider.updateProfile).toHaveBeenCalledWith(props);
  });

  it("should return error if repository fetch fails", async () => {
    const authProvider = new FakeAuthProvider();
    const profileRepo = new InMemoryUserProfileRepository();
    const useCase = new UpdateProfileUseCase(authProvider, profileRepo);

    // Mock failure
    profileRepo.findByIdResult = { ok: false, error: new DomainError("DB Error") };

    const result = await useCase.execute("user-1", { fullName: "New Name" });

    expect(result.ok).toBe(false);
    expect(authProvider.updateProfile).not.toHaveBeenCalled();
  });
});
