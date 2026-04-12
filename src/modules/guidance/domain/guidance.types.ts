export type GuidanceMilestoneId =
  | "navigation_understood"
  | "collection_created"
  | "field_created"
  | "record_created"
  | "template_created"
  | "document_opened"
  | "ai_configured"
  | "role_created"
  | "member_invited"
  | "permission_updated";

export type GuidanceCoachmarkPlacement = "auto" | "top" | "right" | "bottom" | "left";

export interface GuideStepDefinition {
  id: string;
  title: string;
  description: string;
  anchor?: string;
  placement?: GuidanceCoachmarkPlacement;
  articleId?: string;
  ctaLabel?: string;
  ctaHref?: string;
  advanceOnMilestone?: GuidanceMilestoneId;
}

export interface GuideDefinition {
  id: string;
  title: string;
  summary: string;
  pageContextId: string;
  articleId: string;
  targetRoute: string;
  steps: GuideStepDefinition[];
  adminOnly?: boolean;
  autoStart?: "never" | "new-users";
  completionMilestone?: GuidanceMilestoneId;
  featured?: boolean;
}

export type HelpArticleSection =
  | {
      type: "overview";
      title?: string;
      content: string;
    }
  | {
      type: "step-list";
      title: string;
      items: string[];
    }
  | {
      type: "callout";
      tone: "info" | "success" | "warning";
      title: string;
      content: string;
    }
  | {
      type: "checklist";
      title: string;
      items: string[];
    }
  | {
      type: "related-guides";
      title: string;
      guideIds: string[];
    }
  | {
      type: "route-cta";
      title: string;
      href: string;
      label: string;
      description?: string;
      adminOnly?: boolean;
    };

export interface HelpArticleDefinition {
  id: string;
  title: string;
  summary: string;
  category: string;
  keywords: string[];
  adminOnly?: boolean;
  guideIds?: string[];
  sections: HelpArticleSection[];
}

export interface GuidanceChecklistItemDefinition {
  id: string;
  title: string;
  description: string;
  milestoneId: GuidanceMilestoneId;
  guideId?: string;
  articleId?: string;
  adminOnly?: boolean;
}

export interface GuidancePreferences {
  completedMilestones: GuidanceMilestoneId[];
  completedGuideIds: string[];
  dismissedGuideIds: string[];
  viewedArticleIds: string[];
  existingUserNudgeDismissed: boolean;
}

export interface GuidancePageContext {
  id: string;
  title?: string;
  guideIds?: string[];
}

export interface GuidanceChecklistItem extends GuidanceChecklistItemDefinition {
  completed: boolean;
  current: boolean;
  locked: boolean;
}
