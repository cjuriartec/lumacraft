"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type {
  GuideDefinition,
  GuideStepDefinition,
} from "@/modules/guidance/domain/guidance.types";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/presentation/components/ui/button";
import { useMediaQuery } from "@/shared/presentation/hooks/use-media-query";

const PANEL_WIDTH = 360;
const PANEL_MARGIN = 24;
const SPOTLIGHT_PADDING = 10;

type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function isElementVisible(element: HTMLElement) {
  const rect = element.getBoundingClientRect();

  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0;
}

function resolvePanelPosition(rect: SpotlightRect, viewportWidth: number, viewportHeight: number) {
  const canFitRight = rect.left + rect.width + PANEL_WIDTH + PANEL_MARGIN * 2 <= viewportWidth;
  const top = Math.min(
    Math.max(rect.top, PANEL_MARGIN),
    Math.max(PANEL_MARGIN, viewportHeight - 240),
  );

  if (canFitRight) {
    return {
      top,
      left: rect.left + rect.width + PANEL_MARGIN,
    };
  }

  return {
    top,
    left: Math.max(PANEL_MARGIN, rect.left - PANEL_WIDTH - PANEL_MARGIN),
  };
}

interface GuidanceCoachmarkProps {
  guide: GuideDefinition | null;
  step: GuideStepDefinition | null;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onDismiss: () => void;
  onOpenArticle: (articleId: string) => void;
}

export function GuidanceCoachmark({
  guide,
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrevious,
  onDismiss,
  onOpenArticle,
}: GuidanceCoachmarkProps) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);

  useEffect(() => {
    let frameId = 0;

    const syncSpotlight = () => {
      if (!guide || !step?.anchor || isMobile) {
        setSpotlightRect(null);
        return;
      }

      const element = document.querySelector<HTMLElement>(
        `[data-guidance-anchor="${step.anchor}"]`,
      );

      if (!element || !isElementVisible(element)) {
        setSpotlightRect(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      setSpotlightRect({
        top: rect.top - SPOTLIGHT_PADDING,
        left: rect.left - SPOTLIGHT_PADDING,
        width: rect.width + SPOTLIGHT_PADDING * 2,
        height: rect.height + SPOTLIGHT_PADDING * 2,
      });
    };

    const scheduleSpotlightSync = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(syncSpotlight);
    };

    if (!guide || !step?.anchor || isMobile) {
      scheduleSpotlightSync();
      return () => {
        if (frameId) {
          window.cancelAnimationFrame(frameId);
        }
      };
    }

    scheduleSpotlightSync();
    window.addEventListener("resize", scheduleSpotlightSync);
    window.addEventListener("scroll", scheduleSpotlightSync, true);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener("resize", scheduleSpotlightSync);
      window.removeEventListener("scroll", scheduleSpotlightSync, true);
    };
  }, [guide, isMobile, step?.anchor]);

  const panelPosition = useMemo(() => {
    if (!spotlightRect || typeof window === "undefined") {
      return null;
    }

    return resolvePanelPosition(spotlightRect, window.innerWidth, window.innerHeight);
  }, [spotlightRect]);

  const articleId = step?.articleId ?? guide?.articleId;
  const nextLabel = stepIndex === totalSteps - 1 ? "Finalizar" : "Siguiente";

  return (
    <AnimatePresence>
      {guide && step && (
        <>
          {!isMobile && spotlightRect && (
            <motion.div
              key={`${guide.id}-${step.id}-spotlight`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none fixed z-50 rounded-2xl ring-2 ring-primary/70"
              style={{
                top: spotlightRect.top,
                left: spotlightRect.left,
                width: spotlightRect.width,
                height: spotlightRect.height,
                boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.62)",
              }}
            />
          )}

          <motion.div
            key={`${guide.id}-${step.id}-panel`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "fixed z-60 rounded-[1.4rem] border border-border/60 bg-surface/95 text-foreground shadow-[0_28px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl",
              isMobile || !panelPosition ? "inset-x-4 bottom-4" : "w-[360px]",
            )}
            style={
              !isMobile && panelPosition
                ? {
                    top: panelPosition.top,
                    left: panelPosition.left,
                  }
                : undefined
            }
          >
            <div className="flex items-start justify-between gap-4 border-b border-border/30 px-5 py-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary/80">
                  {guide.title}
                </p>
                <p className="text-[11px] font-medium text-foreground/45">
                  Paso {stepIndex + 1} de {totalSteps}
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar guía"
                onClick={onDismiss}
                className="rounded-full p-1.5 text-foreground/40 transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="space-y-2">
                <h3 className="text-[1.05rem] font-semibold tracking-[-0.02em] text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm leading-6 text-foreground/68">{step.description}</p>
                {step.advanceOnMilestone && (
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary/70">
                    Esta ayuda también avanza automáticamente cuando completes la acción.
                  </p>
                )}
              </div>

              {articleId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenArticle(articleId)}
                  className="h-8 rounded-xl px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/70 hover:bg-surface-hover/60 hover:text-foreground"
                >
                  <BookOpen size={14} />
                  Abrir manual
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border/30 px-5 py-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onPrevious}
                disabled={stepIndex === 0}
                className="rounded-xl px-3 text-foreground/65"
              >
                <ChevronLeft size={14} />
                Anterior
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={onNext}
                className="rounded-xl px-4 font-semibold"
              >
                {nextLabel}
                <ChevronRight size={14} />
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
