import { UserPreferences } from "@/modules/auth/domain/entities/user-profile.entity";
import { IUserProfileRepository } from "@/modules/auth/domain/ports/user-profile-repository.port";
import { ok, Result } from "@/shared/domain/result";

export class GetUserPreferencesUseCase {
  constructor(private userProfileRepository: IUserProfileRepository) {}

  public async execute(userId: string): Promise<Result<UserPreferences>> {
    const profileRes = await this.userProfileRepository.findById(userId);
    if (!profileRes.ok) return profileRes;

    return ok(profileRes.value.preferences);
  }
}
