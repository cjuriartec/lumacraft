import { Result } from "@/shared/domain/result";

import { UserProfile } from "../entities/user-profile.entity";

export interface IUserProfileRepository {
  findById(userId: string): Promise<Result<UserProfile>>;
  save(profile: UserProfile): Promise<Result<void>>;
}
