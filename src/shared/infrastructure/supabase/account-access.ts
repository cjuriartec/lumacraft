import "server-only";

import { SupabaseClient } from "@supabase/supabase-js";

import { DomainError, fail, ok, Result } from "@/shared/domain/result";

export interface AccountAccessContext {
  isMember: boolean;
  isOwner: boolean;
  isAdmin: boolean;
}

export async function resolveAccountAccess(
  supabase: SupabaseClient,
  userId: string,
  accountId: string,
): Promise<Result<AccountAccessContext>> {
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("owner_id")
    .eq("id", accountId)
    .maybeSingle();

  if (accountError) {
    return fail(new DomainError(accountError.message, "DB_ERROR"));
  }

  if (!account) {
    return ok({
      isMember: false,
      isOwner: false,
      isAdmin: false,
    });
  }

  const isOwner = account.owner_id === userId;

  const { data: member, error: memberError } = await supabase
    .from("account_members")
    .select("role_id")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError) {
    return fail(new DomainError(memberError.message, "DB_ERROR"));
  }

  if (isOwner) {
    return ok({
      isMember: true,
      isOwner: true,
      isAdmin: true,
    });
  }

  if (!member?.role_id) {
    return ok({
      isMember: false,
      isOwner: false,
      isAdmin: false,
    });
  }

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("is_superadmin")
    .eq("id", member.role_id)
    .maybeSingle();

  if (roleError) {
    return fail(new DomainError(roleError.message, "DB_ERROR"));
  }

  return ok({
    isMember: true,
    isOwner: false,
    isAdmin: Boolean(role?.is_superadmin),
  });
}
