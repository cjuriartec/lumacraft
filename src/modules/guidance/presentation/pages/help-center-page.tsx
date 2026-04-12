"use client";

import { BookOpen, Compass, Lock, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { usePermissions } from "@/modules/authorization/presentation/providers/permission-provider";
import { GUIDANCE_GUIDES } from "@/modules/guidance/presentation/catalog/guidance-guides";
import { HELP_ARTICLES } from "@/modules/guidance/presentation/catalog/help-articles";
import { useGuidance } from "@/modules/guidance/presentation/hooks/use-guidance";
import { useGuidancePage } from "@/modules/guidance/presentation/hooks/use-guidance-page";
import { searchHelpArticles } from "@/modules/guidance/presentation/lib/help-center";
import { Badge } from "@/shared/presentation/components/ui/badge";
import { Button } from "@/shared/presentation/components/ui/button";
import { Input } from "@/shared/presentation/components/ui/input";
import { useBreadcrumbs } from "@/shared/presentation/providers/breadcrumb-provider";

import type { HelpArticleDefinition, HelpArticleSection } from "../../domain/guidance.types";

const ALL_CATEGORIES = "Todas";

function HelpSection({
  article,
  section,
}: {
  article: HelpArticleDefinition;
  section: HelpArticleSection;
}) {
  const { isOwner, isSuperAdmin } = usePermissions();
  const { startGuide } = useGuidance();
  const canAccessAdmin = isOwner || isSuperAdmin;

  if (section.type === "overview") {
    return (
      <section className="rounded-2xl border border-border/40 bg-background/55 p-5">
        {section.title && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            {section.title}
          </p>
        )}
        <p className="text-sm leading-7 text-foreground/72">{section.content}</p>
      </section>
    );
  }

  if (section.type === "callout") {
    const toneClassName =
      section.tone === "success"
        ? "border-primary/25 bg-primary/8 text-primary"
        : section.tone === "warning"
          ? "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300"
          : "border-border/50 bg-background/55 text-foreground";

    return (
      <section className={`rounded-2xl border p-5 ${toneClassName}`}>
        <p className="text-sm font-semibold">{section.title}</p>
        <p className="mt-2 text-sm leading-7 text-current/90">{section.content}</p>
      </section>
    );
  }

  if (section.type === "step-list" || section.type === "checklist") {
    return (
      <section className="rounded-2xl border border-border/40 bg-background/55 p-5">
        <p className="text-sm font-semibold text-foreground">{section.title}</p>
        <div className="mt-4 grid gap-3">
          {section.items.map((item, index) => (
            <div
              key={`${article.id}-${section.type}-${index}`}
              className="flex items-start gap-3 rounded-xl border border-border/30 bg-surface/70 px-4 py-3"
            >
              <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                {section.type === "checklist" ? "✓" : index + 1}
              </div>
              <p className="text-sm leading-6 text-foreground/70">{item}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === "related-guides") {
    const relatedGuides = section.guideIds
      .map((guideId) => GUIDANCE_GUIDES.find((guide) => guide.id === guideId) ?? null)
      .filter((guide): guide is (typeof GUIDANCE_GUIDES)[number] => guide !== null)
      .filter((guide) => !guide.adminOnly || canAccessAdmin);

    return (
      <section className="rounded-2xl border border-border/40 bg-background/55 p-5">
        <p className="text-sm font-semibold text-foreground">{section.title}</p>
        <div className="mt-4 grid gap-3">
          {relatedGuides.map((guide) => (
            <button
              key={guide.id}
              type="button"
              onClick={() => startGuide(guide.id)}
              className="rounded-2xl border border-border/35 bg-surface/70 px-4 py-4 text-left transition-colors hover:bg-surface-hover/50"
            >
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary/75">
                <Compass size={12} />
                Guía reiniciable
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">{guide.title}</p>
              <p className="mt-1 text-[13px] leading-6 text-foreground/65">{guide.summary}</p>
            </button>
          ))}
        </div>
      </section>
    );
  }

  const isDisabled = section.adminOnly && !canAccessAdmin;

  return (
    <section className="rounded-2xl border border-border/40 bg-background/55 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{section.title}</p>
          {section.description && (
            <p className="mt-2 text-sm leading-7 text-foreground/70">{section.description}</p>
          )}
        </div>
        {section.adminOnly && (
          <Badge variant="outline" className="rounded-full">
            Solo admin
          </Badge>
        )}
      </div>

      <div className="mt-4">
        {isDisabled ? (
          <Button disabled className="rounded-2xl">
            <Lock size={14} />
            Requiere permisos de administración
          </Button>
        ) : (
          <Button asChild className="rounded-2xl">
            <Link href={section.href}>{section.label}</Link>
          </Button>
        )}
      </div>
    </section>
  );
}

export default function HelpCenterPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { preferences, markArticleViewed, openHelpArticle, startGuide } = useGuidance();

  useGuidancePage({ id: "help" });
  useBreadcrumbs([{ label: "Ayuda" }]);

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES);

  const categories = useMemo(
    () => [ALL_CATEGORIES, ...new Set(HELP_ARTICLES.map((article) => article.category))],
    [],
  );

  const filteredArticles = useMemo(() => {
    const searchedArticles = searchHelpArticles(query, HELP_ARTICLES);

    if (activeCategory === ALL_CATEGORIES) {
      return searchedArticles;
    }

    return searchedArticles.filter((article) => article.category === activeCategory);
  }, [activeCategory, query]);

  const requestedArticleId = searchParams.get("article");
  const selectedArticleId = requestedArticleId ?? filteredArticles[0]?.id ?? HELP_ARTICLES[0].id;
  const selectedArticle =
    filteredArticles.find((article) => article.id === selectedArticleId) ??
    HELP_ARTICLES.find((article) => article.id === selectedArticleId) ??
    HELP_ARTICLES[0];

  const relatedArticles = HELP_ARTICLES.filter(
    (article) =>
      article.id !== selectedArticle.id &&
      (article.category === selectedArticle.category ||
        article.keywords.some((keyword) => selectedArticle.keywords.includes(keyword))),
  ).slice(0, 3);

  const viewedArticlesCount = preferences.viewedArticleIds.length;

  useEffect(() => {
    if (requestedArticleId || !filteredArticles[0]) {
      return;
    }

    router.replace(`${pathname}?article=${filteredArticles[0].id}`, { scroll: false });
  }, [filteredArticles, pathname, requestedArticleId, router]);

  useEffect(() => {
    if (!selectedArticle.id || preferences.viewedArticleIds.includes(selectedArticle.id)) {
      return;
    }

    void markArticleViewed(selectedArticle.id);
  }, [markArticleViewed, preferences.viewedArticleIds, selectedArticle.id]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-8">
      <section className="overflow-hidden rounded-[2rem] border border-border/50 bg-surface p-8">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
              Help Center
            </p>
            <h1 className="mt-4 text-[2.6rem] font-bold tracking-[-0.03em] text-foreground">
              Manual de uso, guías y siguientes pasos
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-foreground/68">
              Explora artículos buscables, abre recorridos reiniciables y encuentra el siguiente
              paso recomendado según el contexto actual del workspace.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/40 bg-background/55 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/45">
                Artículos
              </p>
              <p className="mt-3 text-2xl font-bold tracking-[-0.02em] text-foreground">
                {HELP_ARTICLES.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-background/55 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/45">
                Leídos
              </p>
              <p className="mt-3 text-2xl font-bold tracking-[-0.02em] text-foreground">
                {viewedArticlesCount}
              </p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-background/55 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/45">
                Guías
              </p>
              <p className="mt-3 text-2xl font-bold tracking-[-0.02em] text-foreground">
                {GUIDANCE_GUIDES.length}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/35"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por tema, feature o problema..."
              className="h-12 rounded-2xl border-border/50 bg-background/70 pl-12"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                  activeCategory === category
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-border/40 bg-background/55 text-foreground/55 hover:text-foreground"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[1.8rem] border border-border/50 bg-surface p-4">
          <div className="mb-4 flex items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/45">
            <BookOpen size={12} className="text-primary/70" />
            Biblioteca
          </div>

          <div className="grid gap-2">
            {filteredArticles.map((article) => {
              const isActive = article.id === selectedArticle.id;
              const isRead = preferences.viewedArticleIds.includes(article.id);

              return (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => openHelpArticle(article.id)}
                  className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                    isActive
                      ? "border-primary/20 bg-primary/10"
                      : "border-border/35 bg-background/55 hover:bg-surface-hover/35"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{article.title}</p>
                    {article.adminOnly && (
                      <Badge variant="outline" className="rounded-full">
                        Admin
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-[13px] leading-5 text-foreground/62">{article.summary}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/40">
                      {article.category}
                    </span>
                    {isRead && (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary/75">
                        Leído
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="space-y-6 rounded-[1.8rem] border border-border/50 bg-surface p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-full">
                  {selectedArticle.category}
                </Badge>
                {selectedArticle.adminOnly && (
                  <Badge variant="outline" className="rounded-full">
                    Solo administración
                  </Badge>
                )}
              </div>
              <h2 className="mt-4 text-[2rem] font-bold tracking-[-0.03em] text-foreground">
                {selectedArticle.title}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-foreground/68">
                {selectedArticle.summary}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedArticle.guideIds?.slice(0, 2).map((guideId) => (
                <Button
                  key={guideId}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const guide = GUIDANCE_GUIDES.find((item) => item.id === guideId);
                    if (guide) {
                      startGuide(guide.id);
                    }
                  }}
                  className="rounded-xl text-foreground/70"
                >
                  <Sparkles size={14} />
                  Vinculado a guía
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {selectedArticle.sections.map((section, index) => (
              <HelpSection
                key={`${selectedArticle.id}-${section.type}-${index}`}
                article={selectedArticle}
                section={section}
              />
            ))}
          </div>

          {relatedArticles.length > 0 && (
            <section className="rounded-2xl border border-border/40 bg-background/55 p-5">
              <p className="text-sm font-semibold text-foreground">También te puede servir</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {relatedArticles.map((article) => (
                  <button
                    key={article.id}
                    type="button"
                    onClick={() => openHelpArticle(article.id)}
                    className="rounded-2xl border border-border/35 bg-surface/70 px-4 py-4 text-left transition-colors hover:bg-surface-hover/50"
                  >
                    <p className="text-sm font-semibold text-foreground">{article.title}</p>
                    <p className="mt-2 text-[13px] leading-5 text-foreground/62">
                      {article.summary}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    </div>
  );
}
