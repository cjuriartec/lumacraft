import { describe, expect, it } from "vitest";

import { searchHelpArticles } from "@/modules/guidance/presentation/lib/help-center";

describe("help center search", () => {
  it("returns articles ordered by relevance", () => {
    const results = searchHelpArticles("plantillas");

    expect(results[0]?.id).toBe("plantillas");
    expect(results.map((article) => article.id)).toContain("editor-avanzado-de-plantillas");
  });

  it("returns all articles when the query is empty", () => {
    const results = searchHelpArticles("");

    expect(results.length).toBeGreaterThan(5);
  });
});
