import { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { CheckPermissionUseCase } from "@/modules/authorization/application/use-cases/check-permission.use-case";
import { CollectionPermission } from "@/modules/authorization/domain/entities/permission.entity";
import { IPermissionRepository } from "@/modules/authorization/domain/ports/permission-repository.port";
import { ok } from "@/shared/domain/result";

function createMockSupabase(
  overrides: {
    collection?: { account_id: string } | null;
    account?: { owner_id: string } | null;
    member?: { role_id: string } | null;
    role?: { is_superadmin: boolean } | null;
  } = {},
) {
  return {
    from: vi.fn((table: string) => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        single: vi.fn(() => {
          switch (table) {
            case "collections":
              return { data: overrides.collection ?? { account_id: "acc-1" }, error: null };
            case "accounts":
              return { data: overrides.account ?? { owner_id: "other-user" }, error: null };
            case "account_members":
              return { data: overrides.member ?? { role_id: "role-1" }, error: null };
            case "roles":
              return { data: overrides.role ?? { is_superadmin: false }, error: null };
            default:
              return { data: null, error: null };
          }
        }),
      };
      return chain;
    }),
  } as unknown as SupabaseClient;
}

function createMockRepository(
  permission: CollectionPermission | null = null,
): IPermissionRepository {
  return {
    findByRoleAndCollection: vi.fn().mockResolvedValue(ok(permission)),
    findByRoleId: vi.fn().mockResolvedValue(ok([])),
    findByCollectionId: vi.fn().mockResolvedValue(ok([])),
    findByAccountId: vi.fn().mockResolvedValue(ok([])),
    upsert: vi.fn(),
    delete: vi.fn(),
  };
}

describe("CheckPermissionUseCase", () => {
  it("should return true for account owner", async () => {
    const supabase = createMockSupabase({ account: { owner_id: "user-1" } });
    const repo = createMockRepository();
    const useCase = new CheckPermissionUseCase(repo, supabase);

    const result = await useCase.execute({
      userId: "user-1",
      collectionId: "col-1",
      action: "DELETE",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(true);
  });

  it("should return true for superadmin", async () => {
    const supabase = createMockSupabase({ role: { is_superadmin: true } });
    const repo = createMockRepository();
    const useCase = new CheckPermissionUseCase(repo, supabase);

    const result = await useCase.execute({
      userId: "user-2",
      collectionId: "col-1",
      action: "DELETE",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(true);
  });

  it("should return true when permission grants the action", async () => {
    const perm = new CollectionPermission({
      id: "p-1",
      roleId: "role-1",
      collectionId: "col-1",
      canRead: true,
      canCreate: true,
      canUpdate: false,
      canDelete: false,
    });
    const supabase = createMockSupabase();
    const repo = createMockRepository(perm);
    const useCase = new CheckPermissionUseCase(repo, supabase);

    const readResult = await useCase.execute({
      userId: "user-2",
      collectionId: "col-1",
      action: "READ",
    });
    expect(readResult.ok && readResult.value).toBe(true);

    const createResult = await useCase.execute({
      userId: "user-2",
      collectionId: "col-1",
      action: "CREATE",
    });
    expect(createResult.ok && createResult.value).toBe(true);
  });

  it("should return false when permission denies the action", async () => {
    const perm = new CollectionPermission({
      id: "p-1",
      roleId: "role-1",
      collectionId: "col-1",
      canRead: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    });
    const supabase = createMockSupabase();
    const repo = createMockRepository(perm);
    const useCase = new CheckPermissionUseCase(repo, supabase);

    const result = await useCase.execute({
      userId: "user-2",
      collectionId: "col-1",
      action: "DELETE",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(false);
  });

  it("should return false when no permission record exists", async () => {
    const supabase = createMockSupabase();
    const repo = createMockRepository(null);
    const useCase = new CheckPermissionUseCase(repo, supabase);

    const result = await useCase.execute({
      userId: "user-2",
      collectionId: "col-1",
      action: "READ",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(false);
  });

  it("should return false when user is not a member", async () => {
    const supabase = createMockSupabase({ member: null });
    const repo = createMockRepository();
    const useCase = new CheckPermissionUseCase(repo, supabase);

    const result = await useCase.execute({
      userId: "user-2",
      collectionId: "col-1",
      action: "READ",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(false);
  });
});
