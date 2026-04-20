import { IAuthProvider } from "@/modules/auth/domain/ports/auth-provider.port";
import { IUserProfileRepository } from "@/modules/auth/domain/ports/user-profile-repository.port";
import { Result } from "@/shared/domain/result";

export class UpdateProfileUseCase {
  constructor(
    private authProvider: IAuthProvider,
    private userProfileRepository: IUserProfileRepository,
  ) {}

  public async execute(
    userId: string,
    props: {
      fullName?: string;
      avatarUrl?: string;
    },
  ): Promise<Result<void>> {
    // 1. Update persistent profile table
    const profileRes = await this.userProfileRepository.findById(userId);
    if (!profileRes.ok) return profileRes;

    const profile = profileRes.value;
    profile.updateProfile(props);

    const saveRes = await this.userProfileRepository.save(profile);
    if (!saveRes.ok) return saveRes;

    // 2. Also update auth metadata for session consistency (optional but recommended)
    return this.authProvider.updateProfile(props);
  }
}
