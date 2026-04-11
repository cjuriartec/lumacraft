import { UserPreferences } from "@/modules/auth/domain/entities/user-profile.entity";
import { IUserProfileRepository } from "@/modules/auth/domain/ports/user-profile-repository.port";
import { Result } from "@/shared/domain/result";

export class UpdateUserPreferencesUseCase {
  constructor(private userProfileRepository: IUserProfileRepository) {}

  public async execute(
    userId: string,
    newPreferences: Partial<UserPreferences>,
  ): Promise<Result<void>> {
    const profileRes = await this.userProfileRepository.findById(userId);
    if (!profileRes.ok) return profileRes;

    const profile = profileRes.value;
    profile.updatePreferences(newPreferences);

    return this.userProfileRepository.save(profile);
  }
}
