import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  canRunLocalSupabaseTests,
  cleanupTestUser,
  createServiceRoleSupabaseClient,
  createTestUser,
  getPersonalAccountId,
  TestUserSession,
} from "@/__tests__/helpers/supabase-harness";
import { SupabaseWorkspaceRepository } from "@/modules/workspace/infrastructure/repositories/supabase-workspace.repository";

const describeIfLocalSupabase = canRunLocalSupabaseTests ? describe : describe.skip;

describeIfLocalSupabase("Supabase auth + workspace integration", () => {
  let owner: TestUserSession;

  beforeAll(async () => {
    owner = await createTestUser("owner");
  });

  afterAll(async () => {
    if (owner) {
      await cleanupTestUser(owner.id);
    }
  });

  it("creates a personal workspace through the auth trigger and exposes it through the repository", async () => {
    const accountId = await getPersonalAccountId(owner.id);
    const repository = new SupabaseWorkspaceRepository(owner.client);

    const result = await repository.findByUserId(owner.id);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.some((workspace) => workspace.id === accountId)).toBe(true);
    }
  });

  it("returns the current user workspace ids through the RLS helper function", async () => {
    const accountId = await getPersonalAccountId(owner.id);
    const { data, error } = await owner.client.rpc("get_user_workspace_ids");

    expect(error).toBeNull();
    expect(data).toEqual([{ account_id: accountId }]);
  });

  it("creates the owner membership alongside the personal workspace", async () => {
    const accountId = await getPersonalAccountId(owner.id);
    const service = createServiceRoleSupabaseClient();
    const { data, error } = await service
      .from("account_members")
      .select("account_id, user_id")
      .eq("account_id", accountId)
      .eq("user_id", owner.id)
      .single();

    expect(error).toBeNull();
    expect(data).toEqual({
      account_id: accountId,
      user_id: owner.id,
    });
  });
});
