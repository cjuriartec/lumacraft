"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "@/modules/auth/presentation/providers/auth-provider";
import { useUserPreferences } from "@/modules/auth/presentation/providers/user-preferences-provider";
import { usePermissions } from "@/modules/authorization/presentation/providers/permission-provider";
import type {
  GuidanceChecklistItem,
  GuidanceMilestoneId,
  GuidancePageContext,
  GuidancePreferences,
  GuideDefinition,
  HelpArticleDefinition,
} from "@/modules/guidance/domain/guidance.types";
import {
  DEFAULT_GUIDANCE_PREFERENCES,
  GUIDANCE_PENDING_GUIDE_KEY,
  GUIDANCE_SESSION_DISMISSED_GUIDES_KEY,
  isGuidanceEligibleUser,
  mergeGuidancePreferences,
  normalizeGuidancePreferences,
} from "@/modules/guidance/domain/guidance-preferences";
import { GUIDANCE_CHECKLIST } from "@/modules/guidance/presentation/catalog/guidance-checklist";
import { GUIDANCE_GUIDES } from "@/modules/guidance/presentation/catalog/guidance-guides";
import { HELP_ARTICLES } from "@/modules/guidance/presentation/catalog/help-articles";
import { GuidanceCoachmark } from "@/modules/guidance/presentation/components/guidance-coachmark";
import { HelpLauncher } from "@/modules/guidance/presentation/components/help-launcher";
import { useWorkspace } from "@/modules/workspace/presentation/providers/workspace-provider";
import { useSupabase } from "@/shared/presentation/providers/supabase-provider";

interface GuidanceContextValue {
  preferences: GuidancePreferences;
  activeGuide: GuideDefinition | null;
  activeStepIndex: number;
  checklistItems: GuidanceChecklistItem[];
  currentPageGuides: GuideDefinition[];
  featuredArticles: HelpArticleDefinition[];
  hasNewHelpNudge: boolean;
  isNewGuidanceUser: boolean;
  launcherOpen: boolean;
  setLauncherOpen: (open: boolean) => void;
  registerPageContext: (pageContext: GuidancePageContext | null) => void;
  startGuide: (guideId: string) => void;
  dismissGuide: (guideId?: string) => void;
  completeGuideStep: (guideId?: string) => void;
  trackMilestone: (milestoneId: GuidanceMilestoneId) => Promise<void>;
  openHelpArticle: (articleId: string) => void;
  markArticleViewed: (articleId: string) => Promise<void>;
}

const noopAsync = async () => {};
const noop = () => {};

const defaultContext: GuidanceContextValue = {
  preferences: DEFAULT_GUIDANCE_PREFERENCES,
  activeGuide: null,
  activeStepIndex: 0,
  checklistItems: [],
  currentPageGuides: [],
  featuredArticles: [],
  hasNewHelpNudge: false,
  isNewGuidanceUser: false,
  launcherOpen: false,
  setLauncherOpen: noop,
  registerPageContext: noop,
  startGuide: noop,
  dismissGuide: noop,
  completeGuideStep: noop,
  trackMilestone: noopAsync,
  openHelpArticle: noop,
  markArticleViewed: noopAsync,
};

const GuidanceContext = createContext<GuidanceContextValue>(defaultContext);

type GuidanceWorkspaceSnapshot = {
  workspaceId: string | null;
  firstCollectionId: string | null;
  collectionIdWithField: string | null;
  collectionIdWithRecord: string | null;
  collectionIdWithTemplate: string | null;
  templateId: string | null;
  templateCollectionId: string | null;
  hasConfiguredAI: boolean;
  firstDocument: {
    collectionId: string;
    recordId: string;
    templateId: string;
  } | null;
};

const EMPTY_WORKSPACE_SNAPSHOT: GuidanceWorkspaceSnapshot = {
  workspaceId: null,
  firstCollectionId: null,
  collectionIdWithField: null,
  collectionIdWithRecord: null,
  collectionIdWithTemplate: null,
  templateId: null,
  templateCollectionId: null,
  hasConfiguredAI: false,
  firstDocument: null,
};

function getSessionDismissedGuideIds() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = window.sessionStorage.getItem(GUIDANCE_SESSION_DISMISSED_GUIDES_KEY);
    return value ? (JSON.parse(value) as string[]) : [];
  } catch {
    return [];
  }
}

function saveSessionDismissedGuideIds(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(GUIDANCE_SESSION_DISMISSED_GUIDES_KEY, JSON.stringify(ids));
}

function isGuideAllowed(guide: GuideDefinition, isAdmin: boolean) {
  return !guide.adminOnly || isAdmin;
}

function matchesGuideRoute(pathname: string, targetRoute: string) {
  if (targetRoute === "/") {
    return pathname === "/";
  }

  return pathname === targetRoute || pathname.startsWith(`${targetRoute}/`);
}

function resolveGuideStart(
  guide: GuideDefinition,
  snapshot: GuidanceWorkspaceSnapshot,
): {
  guideId: string;
  href: string;
} {
  if (guide.id === "collection-schema") {
    if (!snapshot.firstCollectionId) {
      return { guideId: "collections-overview", href: "/collections" };
    }

    return {
      guideId: guide.id,
      href: `/collections/${snapshot.firstCollectionId}?tab=fields`,
    };
  }

  if (guide.id === "collection-data") {
    if (!snapshot.firstCollectionId) {
      return { guideId: "collections-overview", href: "/collections" };
    }

    return {
      guideId: guide.id,
      href: `/collections/${snapshot.collectionIdWithRecord ?? snapshot.firstCollectionId}`,
    };
  }

  if (guide.id === "collection-document-entry") {
    if (!snapshot.firstCollectionId) {
      return { guideId: "collections-overview", href: "/collections" };
    }

    return {
      guideId: guide.id,
      href: `/collections/${snapshot.collectionIdWithRecord ?? snapshot.firstCollectionId}`,
    };
  }

  if (guide.id === "collection-templates") {
    if (!snapshot.firstCollectionId) {
      return { guideId: "collections-overview", href: "/collections" };
    }

    return {
      guideId: guide.id,
      href: `/collections/${snapshot.collectionIdWithTemplate ?? snapshot.firstCollectionId}?tab=templates`,
    };
  }

  if (guide.id === "template-editor-overview") {
    if (snapshot.templateId) {
      return {
        guideId: guide.id,
        href: snapshot.templateCollectionId
          ? `/collections/${snapshot.templateCollectionId}/templates/${snapshot.templateId}`
          : `/templates/${snapshot.templateId}`,
      };
    }

    if (snapshot.firstCollectionId) {
      return {
        guideId: "collection-templates",
        href: `/collections/${snapshot.firstCollectionId}?tab=templates`,
      };
    }
  }

  if (guide.id === "document-editor-overview") {
    if (snapshot.firstDocument) {
      return {
        guideId: guide.id,
        href: `/collections/${snapshot.firstDocument.collectionId}/records/${snapshot.firstDocument.recordId}/documents/${snapshot.firstDocument.templateId}`,
      };
    }

    if (!snapshot.firstCollectionId) {
      return { guideId: "collections-overview", href: "/collections" };
    }

    return {
      guideId: "collection-data",
      href: `/collections/${snapshot.collectionIdWithRecord ?? snapshot.firstCollectionId}`,
    };
  }

  return {
    guideId: guide.id,
    href: guide.targetRoute,
  };
}

function getResolvedPathParts(href: string) {
  const [path, query = ""] = href.split("?");
  return {
    path,
    searchParams: new URLSearchParams(query),
  };
}

function hasConfiguredAISecrets(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).some(Boolean);
}

export function GuidanceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { isOwner, isSuperAdmin } = usePermissions();
  const { preferences, updatePreferences } = useUserPreferences();
  const { currentWorkspace } = useWorkspace();
  const { supabase } = useSupabase();

  const [pageContext, setPageContext] = useState<GuidancePageContext | null>(null);
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [workspaceSnapshot, setWorkspaceSnapshot] =
    useState<GuidanceWorkspaceSnapshot>(EMPTY_WORKSPACE_SNAPSHOT);
  const autoStartedGuideIdsRef = useRef<Set<string>>(new Set());
  const autoStartedChecklistItemIdsRef = useRef<Set<string>>(new Set());

  const guidancePreferences = useMemo(
    () => normalizeGuidancePreferences(preferences.guidance),
    [preferences.guidance],
  );
  const isAdmin = isOwner || isSuperAdmin;
  const isNewGuidanceUser = isGuidanceEligibleUser(user);

  useEffect(() => {
    autoStartedGuideIdsRef.current.clear();
    autoStartedChecklistItemIdsRef.current.clear();
  }, [currentWorkspace?.id, user?.id]);

  const updateGuidancePreferences = useCallback(
    async (patch: Partial<GuidancePreferences>) => {
      await updatePreferences({
        guidance: mergeGuidancePreferences(guidancePreferences, patch),
      });
    },
    [guidancePreferences, updatePreferences],
  );

  const currentPageGuides = useMemo(() => {
    if (pageContext?.guideIds?.length) {
      return pageContext.guideIds
        .map((guideId) => GUIDANCE_GUIDES.find((guide) => guide.id === guideId) ?? null)
        .filter((guide): guide is GuideDefinition => guide !== null)
        .filter((guide) => isGuideAllowed(guide, isAdmin));
    }

    if (pageContext?.id) {
      return GUIDANCE_GUIDES.filter(
        (guide) => guide.pageContextId === pageContext.id && isGuideAllowed(guide, isAdmin),
      );
    }

    return GUIDANCE_GUIDES.filter(
      (guide) =>
        guide.targetRoute !== "/help" &&
        matchesGuideRoute(pathname, guide.targetRoute) &&
        isGuideAllowed(guide, isAdmin),
    );
  }, [isAdmin, pageContext, pathname]);

  const activeGuide = useMemo(
    () => GUIDANCE_GUIDES.find((guide) => guide.id === activeGuideId) ?? null,
    [activeGuideId],
  );

  const checklistDefinitions = useMemo(
    () => GUIDANCE_CHECKLIST.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin],
  );

  const checklistItems = useMemo<GuidanceChecklistItem[]>(() => {
    const firstIncompleteIndex = checklistDefinitions.findIndex(
      (item) => !guidancePreferences.completedMilestones.includes(item.milestoneId),
    );

    return checklistDefinitions.map((item, index) => {
      const completed = guidancePreferences.completedMilestones.includes(item.milestoneId);
      const current = !completed && firstIncompleteIndex === index;
      const locked = !completed && firstIncompleteIndex !== -1 && index > firstIncompleteIndex;

      return {
        ...item,
        completed,
        current,
        locked,
      };
    });
  }, [checklistDefinitions, guidancePreferences.completedMilestones]);
  const currentChecklistItem = useMemo(
    () => checklistItems.find((item) => item.current) ?? null,
    [checklistItems],
  );

  const featuredArticles = useMemo(() => {
    const featuredGuideArticleIds = GUIDANCE_GUIDES.filter((guide) => guide.featured)
      .filter((guide) => isGuideAllowed(guide, isAdmin))
      .map((guide) => guide.articleId);
    const currentGuideArticleIds = currentPageGuides.map((guide) => guide.articleId);

    return HELP_ARTICLES.filter(
      (article) =>
        (!article.adminOnly || isAdmin) &&
        (featuredGuideArticleIds.includes(article.id) ||
          currentGuideArticleIds.includes(article.id)),
    );
  }, [currentPageGuides, isAdmin]);

  const hasNewHelpNudge =
    !isNewGuidanceUser &&
    !guidancePreferences.existingUserNudgeDismissed &&
    guidancePreferences.viewedArticleIds.length === 0;
  const effectiveWorkspaceSnapshot =
    currentWorkspace && workspaceSnapshot.workspaceId === currentWorkspace.id
      ? workspaceSnapshot
      : EMPTY_WORKSPACE_SNAPSHOT;

  const refreshWorkspaceSnapshot = useCallback(async () => {
    if (!currentWorkspace) {
      return;
    }

    const [
      collectionsResult,
      fieldsResult,
      recordsResult,
      templatesResult,
      documentsResult,
      aiSettingsResult,
    ] = await Promise.all([
      supabase
        .from("collections")
        .select("id")
        .eq("account_id", currentWorkspace.id)
        .order("created_at", { ascending: true })
        .limit(1),
      supabase
        .from("fields")
        .select("collection_id, collections!inner(account_id)")
        .eq("collections.account_id", currentWorkspace.id)
        .limit(1),
      supabase
        .from("records")
        .select("id, collection_id")
        .eq("account_id", currentWorkspace.id)
        .order("created_at", { ascending: true })
        .limit(1),
      supabase
        .from("templates")
        .select("id, collection_id")
        .eq("account_id", currentWorkspace.id)
        .order("created_at", { ascending: true })
        .limit(1),
      supabase
        .from("record_documents")
        .select("collection_id, record_id, template_id")
        .eq("account_id", currentWorkspace.id)
        .order("created_at", { ascending: true })
        .limit(1),
      supabase
        .from("account_ai_settings")
        .select("provider_secrets")
        .eq("account_id", currentWorkspace.id)
        .maybeSingle(),
    ]);

    const firstCollectionId = collectionsResult.data?.[0]?.id ?? null;
    const collectionIdWithField = fieldsResult.data?.[0]?.collection_id ?? null;
    const firstRecord = recordsResult.data?.[0] ?? null;
    const firstTemplate = templatesResult.data?.[0] ?? null;
    const firstDocumentRow = documentsResult.data?.[0] ?? null;
    const providerSecrets = aiSettingsResult.data?.provider_secrets;

    setWorkspaceSnapshot({
      workspaceId: currentWorkspace.id,
      firstCollectionId,
      collectionIdWithField,
      collectionIdWithRecord: firstRecord?.collection_id ?? null,
      collectionIdWithTemplate: firstTemplate?.collection_id ?? null,
      templateId: firstTemplate?.id ?? null,
      templateCollectionId: firstTemplate?.collection_id ?? null,
      hasConfiguredAI: hasConfiguredAISecrets(providerSecrets),
      firstDocument: firstDocumentRow
        ? {
            collectionId: firstDocumentRow.collection_id,
            recordId: firstDocumentRow.record_id,
            templateId: firstDocumentRow.template_id,
          }
        : null,
    });
  }, [currentWorkspace, supabase]);

  useEffect(() => {
    void refreshWorkspaceSnapshot();
  }, [refreshWorkspaceSnapshot]);

  const retroactiveMilestones = useMemo<GuidanceMilestoneId[]>(() => {
    const milestones: GuidanceMilestoneId[] = [];

    if (effectiveWorkspaceSnapshot.firstCollectionId) {
      milestones.push("collection_created");
    }
    if (effectiveWorkspaceSnapshot.hasConfiguredAI) {
      milestones.push("ai_configured");
    }
    if (effectiveWorkspaceSnapshot.collectionIdWithField) {
      milestones.push("field_created");
    }
    if (effectiveWorkspaceSnapshot.collectionIdWithRecord) {
      milestones.push("record_created");
    }
    if (effectiveWorkspaceSnapshot.templateId) {
      milestones.push("template_created");
    }
    if (effectiveWorkspaceSnapshot.firstDocument) {
      milestones.push("document_opened");
    }

    return milestones;
  }, [effectiveWorkspaceSnapshot]);

  useEffect(() => {
    const missingMilestones = retroactiveMilestones.filter(
      (milestoneId) => !guidancePreferences.completedMilestones.includes(milestoneId),
    );

    if (missingMilestones.length === 0) {
      return;
    }

    void updateGuidancePreferences({ completedMilestones: missingMilestones });
  }, [guidancePreferences.completedMilestones, retroactiveMilestones, updateGuidancePreferences]);

  const markArticleViewed = useCallback(
    async (articleId: string) => {
      if (
        guidancePreferences.viewedArticleIds.includes(articleId) &&
        guidancePreferences.existingUserNudgeDismissed
      ) {
        return;
      }

      await updateGuidancePreferences({
        viewedArticleIds: [articleId],
        existingUserNudgeDismissed: true,
      });
    },
    [
      guidancePreferences.existingUserNudgeDismissed,
      guidancePreferences.viewedArticleIds,
      updateGuidancePreferences,
    ],
  );

  const openHelpArticle = useCallback(
    (articleId: string) => {
      setLauncherOpen(false);
      if (hasNewHelpNudge) {
        void updateGuidancePreferences({ existingUserNudgeDismissed: true });
      }
      router.push(`/help?article=${articleId}`);
    },
    [hasNewHelpNudge, router, updateGuidancePreferences],
  );

  const dismissGuide = useCallback(
    (guideId?: string) => {
      const nextGuideId = guideId ?? activeGuideId;
      if (!nextGuideId) return;

      const sessionDismissedGuideIds = Array.from(
        new Set([...getSessionDismissedGuideIds(), nextGuideId]),
      );
      saveSessionDismissedGuideIds(sessionDismissedGuideIds);

      void updateGuidancePreferences({
        dismissedGuideIds: [nextGuideId],
      });
      setActiveGuideId(null);
      setActiveStepIndex(0);
    },
    [activeGuideId, updateGuidancePreferences],
  );

  const finishGuide = useCallback(
    async (guide: GuideDefinition) => {
      await updateGuidancePreferences({
        completedGuideIds: [guide.id],
        existingUserNudgeDismissed: true,
      });

      setActiveGuideId(null);
      setActiveStepIndex(0);

      if (guide.completionMilestone) {
        await updateGuidancePreferences({
          completedMilestones: [guide.completionMilestone],
        });
      }
    },
    [updateGuidancePreferences],
  );

  const completeGuideStep = useCallback(
    (guideId?: string) => {
      const guide = GUIDANCE_GUIDES.find((item) => item.id === (guideId ?? activeGuideId));
      if (!guide) return;

      if (activeStepIndex >= guide.steps.length - 1) {
        void finishGuide(guide);
        return;
      }

      setActiveStepIndex((current) => Math.min(current + 1, guide.steps.length - 1));
    },
    [activeGuideId, activeStepIndex, finishGuide],
  );

  const startGuide = useCallback(
    (guideId: string) => {
      const guide = GUIDANCE_GUIDES.find((item) => item.id === guideId);
      if (!guide || !isGuideAllowed(guide, isAdmin)) return;

      const resolvedStart = resolveGuideStart(guide, effectiveWorkspaceSnapshot);
      const nextGuide = GUIDANCE_GUIDES.find((item) => item.id === resolvedStart.guideId);
      if (!nextGuide || !isGuideAllowed(nextGuide, isAdmin)) return;

      const resolvedTarget = getResolvedPathParts(resolvedStart.href);
      const activeTab = searchParams.get("tab");
      const targetTab = resolvedTarget.searchParams.get("tab");
      const shouldNavigate =
        pathname !== resolvedTarget.path || (targetTab !== null && activeTab !== targetTab);

      setLauncherOpen(false);

      if (shouldNavigate || !matchesGuideRoute(pathname, nextGuide.targetRoute)) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(GUIDANCE_PENDING_GUIDE_KEY, nextGuide.id);
        }
        router.push(resolvedStart.href);
        return;
      }

      if (hasNewHelpNudge) {
        void updateGuidancePreferences({ existingUserNudgeDismissed: true });
      }

      setActiveGuideId(nextGuide.id);
      setActiveStepIndex(0);
    },
    [
      hasNewHelpNudge,
      isAdmin,
      pathname,
      router,
      searchParams,
      updateGuidancePreferences,
      effectiveWorkspaceSnapshot,
    ],
  );

  const trackMilestone = useCallback(
    async (milestoneId: GuidanceMilestoneId) => {
      const isAlreadyCompleted = guidancePreferences.completedMilestones.includes(milestoneId);

      if (!isAlreadyCompleted) {
        await updateGuidancePreferences({
          completedMilestones: [milestoneId],
          existingUserNudgeDismissed: true,
        });
        // Important: Refresh snapshot after completing a milestone that might change workspace state
        void refreshWorkspaceSnapshot();
      }

      const currentGuide = GUIDANCE_GUIDES.find((guide) => guide.id === activeGuideId);
      const currentStep = currentGuide?.steps[activeStepIndex];
      const currentChecklistGuideCompleted =
        currentChecklistItem?.milestoneId === milestoneId &&
        currentChecklistItem.guideId === currentGuide?.id;

      if (currentGuide && currentChecklistGuideCompleted) {
        await finishGuide(currentGuide);
        return;
      }

      if (currentGuide && currentStep?.advanceOnMilestone === milestoneId) {
        if (activeStepIndex >= currentGuide.steps.length - 1) {
          await finishGuide(currentGuide);
        } else {
          setActiveStepIndex((current) => current + 1);
        }
      }
    },
    [
      activeGuideId,
      activeStepIndex,
      currentChecklistItem,
      finishGuide,
      guidancePreferences.completedMilestones,
      updateGuidancePreferences,
      refreshWorkspaceSnapshot,
    ],
  );

  useEffect(() => {
    if (!pageContext || !isNewGuidanceUser || activeGuideId || currentChecklistItem) {
      return;
    }

    const nextGuide = currentPageGuides.find(
      (guide) =>
        guide.autoStart === "new-users" &&
        !guidancePreferences.completedGuideIds.includes(guide.id) &&
        !guidancePreferences.dismissedGuideIds.includes(guide.id) &&
        !getSessionDismissedGuideIds().includes(guide.id) &&
        !autoStartedGuideIdsRef.current.has(guide.id),
    );

    if (!nextGuide) {
      return;
    }

    autoStartedGuideIdsRef.current.add(nextGuide.id);
    startGuide(nextGuide.id);
  }, [
    activeGuideId,
    currentPageGuides,
    guidancePreferences.completedGuideIds,
    guidancePreferences.dismissedGuideIds,
    isNewGuidanceUser,
    currentChecklistItem,
    pageContext,
    startGuide,
  ]);

  useEffect(() => {
    if (
      !isNewGuidanceUser ||
      activeGuideId ||
      pathname === "/help" ||
      !currentChecklistItem?.guideId ||
      currentChecklistItem.completed ||
      currentChecklistItem.locked
    ) {
      return;
    }

    let frameId = 0;
    const guide = GUIDANCE_GUIDES.find((item) => item.id === currentChecklistItem.guideId);

    if (
      !guide ||
      !isGuideAllowed(guide, isAdmin) ||
      guidancePreferences.completedGuideIds.includes(guide.id) ||
      guidancePreferences.dismissedGuideIds.includes(guide.id) ||
      getSessionDismissedGuideIds().includes(guide.id) ||
      autoStartedChecklistItemIdsRef.current.has(currentChecklistItem.id)
    ) {
      return;
    }

    frameId = window.requestAnimationFrame(() => {
      autoStartedChecklistItemIdsRef.current.add(currentChecklistItem.id);
      startGuide(guide.id);
    });

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [
    activeGuideId,
    currentChecklistItem,
    guidancePreferences.completedGuideIds,
    guidancePreferences.dismissedGuideIds,
    isAdmin,
    isNewGuidanceUser,
    pathname,
    startGuide,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let frameId = 0;

    const pendingGuideId = window.sessionStorage.getItem(GUIDANCE_PENDING_GUIDE_KEY);

    if (!pendingGuideId) {
      return;
    }

    const guide = GUIDANCE_GUIDES.find((item) => item.id === pendingGuideId);

    if (!guide || !matchesGuideRoute(pathname, guide.targetRoute)) {
      return;
    }

    window.sessionStorage.removeItem(GUIDANCE_PENDING_GUIDE_KEY);

    frameId = window.requestAnimationFrame(() => {
      startGuide(guide.id);
    });

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [pathname, startGuide]);

  const setLauncherOpenWithEffects = useCallback(
    (open: boolean) => {
      setLauncherOpen(open);

      if (open && hasNewHelpNudge) {
        void updateGuidancePreferences({ existingUserNudgeDismissed: true });
      }
    },
    [hasNewHelpNudge, updateGuidancePreferences],
  );

  const registerPageContext = useCallback((nextPageContext: GuidancePageContext | null) => {
    setPageContext(nextPageContext);
  }, []);

  const contextValue = useMemo<GuidanceContextValue>(
    () => ({
      preferences: guidancePreferences,
      activeGuide,
      activeStepIndex,
      checklistItems,
      currentPageGuides,
      featuredArticles,
      hasNewHelpNudge,
      isNewGuidanceUser,
      launcherOpen,
      setLauncherOpen: setLauncherOpenWithEffects,
      registerPageContext,
      startGuide,
      dismissGuide,
      completeGuideStep,
      trackMilestone,
      openHelpArticle,
      markArticleViewed,
    }),
    [
      activeGuide,
      activeStepIndex,
      checklistItems,
      completeGuideStep,
      currentPageGuides,
      dismissGuide,
      featuredArticles,
      guidancePreferences,
      hasNewHelpNudge,
      isNewGuidanceUser,
      launcherOpen,
      markArticleViewed,
      openHelpArticle,
      registerPageContext,
      setLauncherOpenWithEffects,
      startGuide,
      trackMilestone,
    ],
  );

  return (
    <GuidanceContext.Provider value={contextValue}>
      {children}
      <HelpLauncher />
      <GuidanceCoachmark
        guide={activeGuide}
        step={activeGuide?.steps[activeStepIndex] ?? null}
        stepIndex={activeStepIndex}
        totalSteps={activeGuide?.steps.length ?? 0}
        onNext={() => completeGuideStep()}
        onPrevious={() => setActiveStepIndex((current) => Math.max(0, current - 1))}
        onDismiss={() => dismissGuide()}
        onOpenArticle={openHelpArticle}
      />
    </GuidanceContext.Provider>
  );
}

export function useGuidance() {
  return useContext(GuidanceContext);
}
