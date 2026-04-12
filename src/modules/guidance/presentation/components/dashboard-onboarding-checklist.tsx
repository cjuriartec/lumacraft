"use client";

import { ArrowRight, CheckCircle2, Compass } from "lucide-react";

import { useGuidance } from "@/modules/guidance/presentation/hooks/use-guidance";
import { Badge } from "@/shared/presentation/components/ui/badge";
import { Button } from "@/shared/presentation/components/ui/button";

export function DashboardOnboardingChecklist() {
  const { checklistItems, startGuide, openHelpArticle } = useGuidance();

  const completedCount = checklistItems.filter((item) => item.completed).length;

  return (
    <section
      data-guidance-anchor="dashboard-guidance-checklist"
      className="rounded-[1.8rem] border border-border/50 bg-surface p-6 shadow-sm"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            Onboarding progresivo
          </p>
          <h2 className="mt-3 text-[1.8rem] font-bold tracking-[-0.02em] text-foreground">
            Primer recorrido sugerido
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/68">
            Este checklist se completa con acciones reales en la app para ayudarte a llegar a tu
            primer flujo de documento sin perder el hilo.
          </p>
        </div>
        <Badge
          variant="outline"
          className="h-fit rounded-full border-primary/20 bg-primary/5 text-primary"
        >
          {completedCount} / {checklistItems.length} completados
        </Badge>
      </div>

      <div className="mt-6 grid gap-3">
        {checklistItems.map((item, index) => (
          <div
            key={item.id}
            className={`flex flex-col gap-4 rounded-2xl border px-4 py-4 md:flex-row md:items-center md:justify-between ${
              item.current
                ? "border-primary/25 bg-primary/5"
                : item.locked
                  ? "border-border/30 bg-background/35 opacity-70"
                  : "border-border/40 bg-background/45"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                {item.completed ? <CheckCircle2 size={18} /> : <span>{index + 1}</span>}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  {item.current && (
                    <Badge
                      variant="outline"
                      className="rounded-full border-primary/20 text-primary"
                    >
                      Paso actual
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-[13px] leading-5 text-foreground/62">{item.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {item.completed ? (
                <Badge variant="secondary" className="rounded-full">
                  Listo
                </Badge>
              ) : item.locked ? (
                <Badge variant="outline" className="rounded-full">
                  Se desbloquea al completar el paso anterior
                </Badge>
              ) : (
                <>
                  {item.guideId && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => startGuide(item.guideId!)}
                      className="rounded-xl"
                    >
                      <Compass size={14} />
                      Abrir guía
                    </Button>
                  )}
                  {item.articleId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openHelpArticle(item.articleId!)}
                      className="rounded-xl text-foreground/70"
                    >
                      Manual
                      <ArrowRight size={14} />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
