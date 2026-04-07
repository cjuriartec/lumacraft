import { execFileSync } from "node:child_process";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.API_URL;
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.PUBLISHABLE_KEY ??
  process.env.ANON_KEY;
const privilegedKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SECRET_KEY;
const databaseUrl =
  process.env.DB_URL ??
  (supabaseUrl && isLocalUrl(supabaseUrl)
    ? "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    : undefined);

function isLocalUrl(url: string) {
  return /127\.0\.0\.1|localhost/.test(url);
}

export const canRunLocalSupabaseTests =
  Boolean(supabaseUrl && publishableKey && privilegedKey) &&
  (process.env.ENABLE_REMOTE_SUPABASE_TESTS === "true" || isLocalUrl(supabaseUrl!));

function requireEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required Supabase test environment variable: ${name}`);
  }

  return value;
}

function escapeSqlLiteral(value: string) {
  return value.replaceAll("'", "''");
}

function runSql(sql: string) {
  execFileSync(
    "psql",
    [
      "--dbname",
      requireEnv("DB_URL", databaseUrl),
      "--no-psqlrc",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ],
    {
      stdio: "ignore",
    },
  );
}

export function createAnonSupabaseClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", publishableKey),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export function createAdminSupabaseClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl),
    requireEnv("SUPABASE_SECRET_KEY", privilegedKey),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export interface TestUserSession {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
}

export async function createTestUser(label: string): Promise<TestUserSession> {
  const nonce = crypto.randomUUID().slice(0, 8);
  const email = `${label}-${nonce}@example.com`;
  const password = "Passw0rd!123";
  const signupClient = createAnonSupabaseClient();

  const { data, error } = await signupClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: `Test ${label}`,
      },
    },
  });

  if (error || !data.user) {
    throw error ?? new Error("Failed to create test user");
  }

  const client = createAnonSupabaseClient();
  const signInResult = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (signInResult.error) {
    throw signInResult.error;
  }

  return {
    id: data.user.id,
    email,
    password,
    client,
  };
}

export async function getPersonalAccountId(userId: string) {
  const service = createAdminSupabaseClient();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await service
      .from("accounts")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

    if (data?.id) {
      return data.id as string;
    }

    if (error) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Workspace not found for ${userId}`);
}

export async function addMemberToAccount(accountId: string, userId: string) {
  const service = createAdminSupabaseClient();

  // Get the Superadmin role for this account
  const { data: roleData, error: roleError } = await service
    .from("roles")
    .select("id")
    .eq("account_id", accountId)
    .eq("is_superadmin", true)
    .single();

  if (roleError) {
    throw new Error(
      `Failed to find Superadmin role for account ${accountId}: ${roleError.message}`,
    );
  }

  const { error } = await service.from("account_members").insert({
    account_id: accountId,
    user_id: userId,
    role_id: roleData.id,
  });

  if (error) {
    throw error;
  }
}

export async function cleanupTestUser(userId: string) {
  const escapedUserId = escapeSqlLiteral(userId);

  runSql(`
    DELETE FROM public.account_members
    WHERE user_id = '${escapedUserId}';

    DELETE FROM public.accounts
    WHERE owner_id = '${escapedUserId}';

    DELETE FROM auth.users
    WHERE id = '${escapedUserId}';
  `);
}
