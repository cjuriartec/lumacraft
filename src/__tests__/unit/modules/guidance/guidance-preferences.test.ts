import { describe, expect, it } from "vitest";

import {
  DEFAULT_GUIDANCE_PREFERENCES,
  isGuidanceEligibleUser,
  mergeGuidancePreferences,
  normalizeGuidancePreferences,
} from "@/modules/guidance/domain/guidance-preferences";

describe("guidance preferences", () => {
  it("normalizes guidance preferences with defaults", () => {
    expect(normalizeGuidancePreferences()).toEqual(DEFAULT_GUIDANCE_PREFERENCES);
  });

  it("merges milestones, guides and viewed articles without duplicates", () => {
    const result = mergeGuidancePreferences(
      {
        completedMilestones: ["collection_created"],
        completedGuideIds: ["dashboard-overview"],
        dismissedGuideIds: ["collections-overview"],
        viewedArticleIds: ["primeros-pasos"],
        existingUserNudgeDismissed: false,
      },
      {
        completedMilestones: ["collection_created", "field_created"],
        completedGuideIds: ["dashboard-overview", "collection-schema"],
        dismissedGuideIds: ["collections-overview", "template-list-overview"],
        viewedArticleIds: ["primeros-pasos", "colecciones"],
        existingUserNudgeDismissed: true,
      },
    );

    expect(result.completedMilestones).toEqual(["collection_created", "field_created"]);
    expect(result.completedGuideIds).toEqual(["dashboard-overview", "collection-schema"]);
    expect(result.dismissedGuideIds).toEqual(["collections-overview", "template-list-overview"]);
    expect(result.viewedArticleIds).toEqual(["primeros-pasos", "colecciones"]);
    expect(result.existingUserNudgeDismissed).toBe(true);
  });

  it("resolves rollout eligibility using the rollout date", () => {
    expect(isGuidanceEligibleUser({ createdAt: new Date("2026-04-12T00:00:00.000Z") })).toBe(true);
    expect(isGuidanceEligibleUser({ createdAt: new Date("2026-04-10T23:59:59.000Z") })).toBe(false);
  });
});
