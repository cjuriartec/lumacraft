import type { User } from "@/modules/auth/domain/entities/user.entity";

import type { GuidancePreferences } from "./guidance.types";

export const GUIDANCE_ROLLOUT_DATE = "2026-04-11T00:00:00.000Z";

export const GUIDANCE_PENDING_GUIDE_KEY = "lumacraft.guidance.pending-guide";
export const GUIDANCE_SESSION_DISMISSED_GUIDES_KEY = "lumacraft.guidance.session-dismissed-guides";

export const DEFAULT_GUIDANCE_PREFERENCES: GuidancePreferences = {
  completedMilestones: [],
  completedGuideIds: [],
  dismissedGuideIds: [],
  viewedArticleIds: [],
  existingUserNudgeDismissed: false,
};

export function normalizeGuidancePreferences(
  preferences?: Partial<GuidancePreferences> | null,
): GuidancePreferences {
  return {
    completedMilestones: Array.from(new Set(preferences?.completedMilestones ?? [])),
    completedGuideIds: Array.from(new Set(preferences?.completedGuideIds ?? [])),
    dismissedGuideIds: Array.from(new Set(preferences?.dismissedGuideIds ?? [])),
    viewedArticleIds: Array.from(new Set(preferences?.viewedArticleIds ?? [])),
    existingUserNudgeDismissed: preferences?.existingUserNudgeDismissed ?? false,
  };
}

export function mergeGuidancePreferences(
  current?: Partial<GuidancePreferences> | null,
  incoming?: Partial<GuidancePreferences> | null,
): GuidancePreferences {
  const normalizedCurrent = normalizeGuidancePreferences(current);

  if (!incoming) {
    return normalizedCurrent;
  }

  return normalizeGuidancePreferences({
    completedMilestones: [
      ...normalizedCurrent.completedMilestones,
      ...(incoming.completedMilestones ?? []),
    ],
    completedGuideIds: [
      ...normalizedCurrent.completedGuideIds,
      ...(incoming.completedGuideIds ?? []),
    ],
    dismissedGuideIds: [
      ...normalizedCurrent.dismissedGuideIds,
      ...(incoming.dismissedGuideIds ?? []),
    ],
    viewedArticleIds: [...normalizedCurrent.viewedArticleIds, ...(incoming.viewedArticleIds ?? [])],
    existingUserNudgeDismissed:
      incoming.existingUserNudgeDismissed ?? normalizedCurrent.existingUserNudgeDismissed,
  });
}

export function isGuidanceEligibleUser(
  user: Pick<User, "createdAt"> | null | undefined,
  rolloutDate: string = GUIDANCE_ROLLOUT_DATE,
) {
  if (!user?.createdAt) {
    return false;
  }

  return user.createdAt.getTime() >= new Date(rolloutDate).getTime();
}
