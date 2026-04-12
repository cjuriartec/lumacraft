"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Compass, LifeBuoy, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { useGuidance } from "@/modules/guidance/presentation/hooks/use-guidance";
import { Button } from "@/shared/presentation/components/ui/button";

export function HelpLauncher() {
  const {
    checklistItems,
    currentPageGuides,
    featuredArticles,
    hasNewHelpNudge,
    launcherOpen,
    setLauncherOpen,
    openHelpArticle,
    startGuide,
  } = useGuidance();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const currentChecklistItem =
    checklistItems.find((item) => item.current) ??
    checklistItems.find((item) => !item.completed && !item.locked) ??
    null;
  const upcomingChecklistItems = checklistItems
    .filter((item) => !item.completed && item.locked)
    .slice(0, 2);

  useEffect(() => {
    if (!launcherOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (containerRef.current?.contains(target)) {
        return;
      }

      setLauncherOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [launcherOpen, setLauncherOpen]);

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {launcherOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="max-h-[min(42rem,calc(100vh-7rem))] w-[360px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-[1.6rem] border border-border/60 bg-surface/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary/80">
                  Centro de Ayuda
                </p>
                <h3 className="mt-2 text-[1.1rem] font-semibold tracking-[-0.02em] text-foreground">
                  Siguiente mejor paso
                </h3>
                <p className="mt-1 text-sm leading-6 text-foreground/65">
                  Guías reiniciables, manual integrado y progreso real sobre la app.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLauncherOpen(false)}
                className="rounded-full px-2 py-1 text-xs font-semibold text-foreground/45 transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                Cerrar
              </button>
            </div>

            {currentChecklistItem && (
              <div className="mb-5 space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/45">
                  <Compass size={12} className="text-primary/70" />
                  Paso secuencial actual
                </div>
                <button
                  type="button"
                  onClick={() =>
                    currentChecklistItem.guideId
                      ? startGuide(currentChecklistItem.guideId)
                      : openHelpArticle(currentChecklistItem.articleId!)
                  }
                  className="block w-full rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-left transition-colors hover:bg-primary/10"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {currentChecklistItem.title}
                  </p>
                  <p className="mt-1 text-[13px] leading-5 text-foreground/62">
                    {currentChecklistItem.description}
                  </p>
                </button>
              </div>
            )}

            {upcomingChecklistItems.length > 0 && (
              <div className="mb-5 space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/45">
                  <Compass size={12} className="text-foreground/40" />
                  Luego sigue
                </div>
                {upcomingChecklistItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/40 bg-background/45 px-4 py-3 opacity-70"
                  >
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-[13px] leading-5 text-foreground/58">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {currentPageGuides.length > 0 && (
              <div className="mb-5 space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/45">
                  <Sparkles size={12} className="text-primary/70" />
                  Guías de esta pantalla
                </div>
                {currentPageGuides.slice(0, 2).map((guide) => (
                  <button
                    key={guide.id}
                    type="button"
                    onClick={() => startGuide(guide.id)}
                    className="block w-full rounded-2xl border border-border/50 bg-background/60 px-4 py-3 text-left transition-colors hover:bg-surface-hover/40"
                  >
                    <p className="text-sm font-semibold text-foreground">{guide.title}</p>
                    <p className="mt-1 text-[13px] leading-5 text-foreground/62">{guide.summary}</p>
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/45">
                <BookOpen size={12} className="text-primary/70" />
                Manual recomendado
              </div>
              <div className="grid gap-2">
                {featuredArticles.slice(0, 3).map((article) => (
                  <button
                    key={article.id}
                    type="button"
                    onClick={() => openHelpArticle(article.id)}
                    className="rounded-2xl border border-border/50 bg-background/60 px-4 py-3 text-left transition-colors hover:bg-surface-hover/40"
                  >
                    <p className="text-sm font-semibold text-foreground">{article.title}</p>
                    <p className="mt-1 text-[13px] leading-5 text-foreground/62">
                      {article.summary}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <Button asChild className="mt-5 w-full rounded-2xl">
              <Link href="/help" onClick={() => setLauncherOpen(false)}>
                <BookOpen size={14} />
                Abrir Help Center completo
              </Link>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        aria-label="Abrir centro de ayuda"
        onClick={() => setLauncherOpen(!launcherOpen)}
        className="group relative flex h-14 items-center gap-3 rounded-full border border-border/50 bg-surface/95 px-4 text-foreground shadow-[0_16px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl transition-transform hover:-translate-y-0.5"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/12 text-primary">
          <LifeBuoy size={18} />
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/45">
            Ayuda
          </p>
          <p className="text-sm font-semibold text-foreground">Guías y manual</p>
        </div>
        {hasNewHelpNudge && (
          <span className="absolute -right-1 -top-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-background">
            Nuevo
          </span>
        )}
      </button>
    </div>
  );
}
