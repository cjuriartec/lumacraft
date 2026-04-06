import { describe, expect, it } from "vitest";

import {
  aiDraftSchema,
  conditionalDraftSchema,
  listDraftSchema,
  switchDraftSchema,
} from "@/modules/template/presentation/lib/logic-block-drafts";

describe("logic block draft schemas", () => {
  it("validates conditional drafts with primitive values", () => {
    const valid = conditionalDraftSchema.safeParse({
      fieldPath: "estado",
      operator: "equals",
      value: true,
      thenTemplate: "ok",
    });

    expect(valid.success).toBe(true);
  });

  it("requires value for conditional operators except empty checks", () => {
    const invalid = conditionalDraftSchema.safeParse({
      fieldPath: "estado",
      operator: "equals",
      thenTemplate: "ok",
    });
    const validEmpty = conditionalDraftSchema.safeParse({
      fieldPath: "estado",
      operator: "is_empty",
      thenTemplate: "ok",
    });

    expect(invalid.success).toBe(false);
    expect(validEmpty.success).toBe(true);
  });

  it("rejects duplicate switch cases", () => {
    const result = switchDraftSchema.safeParse({
      fieldPath: "estado",
      cases: [
        { equals: "aprobado", template: "uno" },
        { equals: "aprobado", template: "dos" },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("enforces valid list alias format", () => {
    const result = listDraftSchema.safeParse({
      sourcePath: "items",
      itemAlias: "1-item",
      itemTemplate: "{{item.nombre}}",
    });

    expect(result.success).toBe(false);
  });

  it("requires ai prompt template", () => {
    const result = aiDraftSchema.safeParse({
      promptTemplate: "",
    });

    expect(result.success).toBe(false);
  });

  it("accepts prompts without explicit grounding variables since root is auto-injected", () => {
    const withoutVariables = aiDraftSchema.safeParse({
      promptTemplate: "Resume este registro",
    });
    const withVariables = aiDraftSchema.safeParse({
      promptTemplate: "Resume {{root}}",
    });

    expect(withoutVariables.success).toBe(true);
    expect(withVariables.success).toBe(true);
  });
});
