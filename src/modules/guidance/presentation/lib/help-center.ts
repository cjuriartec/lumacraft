import { HELP_ARTICLES } from "@/modules/guidance/presentation/catalog/help-articles";

import type { HelpArticleDefinition } from "../../domain/guidance.types";

function scoreArticle(article: HelpArticleDefinition, normalizedQuery: string) {
  if (!normalizedQuery) {
    return 0;
  }

  let score = 0;

  if (article.title.toLowerCase().includes(normalizedQuery)) {
    score += 8;
  }

  if (article.summary.toLowerCase().includes(normalizedQuery)) {
    score += 4;
  }

  if (article.category.toLowerCase().includes(normalizedQuery)) {
    score += 2;
  }

  for (const keyword of article.keywords) {
    if (keyword.toLowerCase().includes(normalizedQuery)) {
      score += 3;
    }
  }

  return score;
}

export function searchHelpArticles(
  query: string,
  articles: HelpArticleDefinition[] = HELP_ARTICLES,
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [...articles];
  }

  return [...articles]
    .map((article) => ({
      article,
      score: scoreArticle(article, normalizedQuery),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.article.title.localeCompare(right.article.title, "es");
    })
    .map(({ article }) => article);
}
