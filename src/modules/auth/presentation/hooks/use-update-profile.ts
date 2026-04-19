"use client";

import { UpdateProfileUseCase } from "../../application/use-cases/update-profile.use-case";
import { SupabaseUserProfileRepository } from "../../infrastructure/repositories/supabase-user-profile.repository";
import { SupabaseAuthService } from "../../infrastructure/services/supabase-auth.service";
import { useAuth } from "../providers/auth-provider";

export const useUpdateProfile = () => {
  const { user } = useAuth();

  const updateProfile = async (props: { fullName?: string; avatarUrl?: string }) => {
    if (!user) throw new Error("User must be authenticated to update profile");

    const authService = new SupabaseAuthService();
    const profileRepo = new SupabaseUserProfileRepository();
    const useCase = new UpdateProfileUseCase(authService, profileRepo);

    return useCase.execute(user.id, props);
  };

  return { updateProfile };
};
