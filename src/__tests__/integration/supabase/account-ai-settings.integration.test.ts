import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  canRunLocalSupabaseTests,
  cleanupTestUser,
  createTestUser,
  getPersonalAccountId,
  TestUserSession,
} from "@/__tests__/helpers/supabase-harness";
import { AccountAISettings } from "@/modules/ai/domain/entities/account-ai-settings.entity";
import { SupabaseAccountAISettingsRepository } from "@/modules/ai/infrastructure/repositories/supabase-account-ai-settings.repository";

const describeIfLocalSupabase = canRunLocalSupabaseTests ? describe : describe.skip;

describeIfLocalSupabase("Account AI Settings Repository Integration", () => {
  let user: TestUserSession;
  let accountId: string;
  let repository: SupabaseAccountAISettingsRepository;

  beforeAll(async () => {
    user = await createTestUser("ai-settings-tester");
    accountId = await getPersonalAccountId(user.id);
    repository = new SupabaseAccountAISettingsRepository(user.client);
  });

  afterAll(async () => {
    if (user) {
      await cleanupTestUser(user.id);
    }
  });

  it("should persist and retrieve fallback settings", async () => {
    // 1. Create defaults or get existing
    const initialResult = await repository.findByAccountId(accountId);
    let settings: AccountAISettings;

    if (initialResult.ok && initialResult.value) {
      settings = initialResult.value;
    } else {
      const createResult = await repository.createDefaults(accountId);
      if (!createResult.ok) throw createResult.error;
      settings = createResult.value;
    }

    // 2. Patch with fallback settings
    const updatedResult = settings.withPatch({
      enableFallback: true,
      fallbackProvider: "OPENAI",
      fallbackModel: "gpt-5.4-mini",
    });

    if (!updatedResult.ok) throw updatedResult.error;

    // 3. Save
    const saveResult = await repository.save(updatedResult.value);
    if (!saveResult.ok) {
      console.error("Save failure error:", JSON.stringify(saveResult.error, null, 2));
    }
    expect(saveResult.ok).toBe(true);

    // 4. Retrieve and verify
    const findResult = await repository.findByAccountId(accountId);
    expect(findResult.ok).toBe(true);
    if (findResult.ok && findResult.value) {
      expect(findResult.value.enableFallback).toBe(true);
      expect(findResult.value.fallbackProvider).toBe("OPENAI");
      expect(findResult.value.fallbackModel).toBe("gpt-5.4-mini");
    }
  });
});
