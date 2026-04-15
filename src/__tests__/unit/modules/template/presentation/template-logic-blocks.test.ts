import { describe, expect, it } from "vitest";

import {
  createAIElement,
  createConditionalElement,
  createListElement,
  createSwitchElement,
} from "@/modules/template/presentation/components/template-logic-blocks";

describe("template logic block defaults", () => {
  it("initializes new logic blocks with Arial as the persisted font family", () => {
    expect(createConditionalElement().fontFamily).toBe("arial");
    expect(createListElement().fontFamily).toBe("arial");
    expect(createSwitchElement().fontFamily).toBe("arial");
    expect(createAIElement().fontFamily).toBe("arial");
  });
});
