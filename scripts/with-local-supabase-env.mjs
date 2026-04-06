import { execFileSync, spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");
}

function signJwt(payload, secret) {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function readApiPortFromConfig() {
  const configPath = path.resolve(process.cwd(), "supabase/config.toml");
  const config = readFileSync(configPath, "utf8");
  const match = config.match(/\[api\][\s\S]*?port = (\d+)/m);

  return match?.[1] ?? "54321";
}

function buildFallbackLocalEnv() {
  const port = readApiPortFromConfig();
  const apiUrl = `http://127.0.0.1:${port}`;
  const jwtSecret =
    process.env.JWT_SECRET ?? "super-secret-jwt-token-with-at-least-32-characters-long";
  const expiration = 1983812996;
  const anonKey = signJwt(
    {
      iss: "supabase-demo",
      role: "anon",
      exp: expiration,
    },
    jwtSecret,
  );
  const serviceRoleKey = signJwt(
    {
      iss: "supabase-demo",
      role: "service_role",
      exp: expiration,
    },
    jwtSecret,
  );

  return {
    API_URL: apiUrl,
    ANON_KEY: anonKey,
    PUBLISHABLE_KEY: anonKey,
    SERVICE_ROLE_KEY: serviceRoleKey,
    JWT_SECRET: jwtSecret,
    NEXT_PUBLIC_SUPABASE_URL: apiUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    SUPABASE_SERVICE_ROLE_JWT: serviceRoleKey,
    ENABLE_TEST_AUTH: "true",
  };
}

async function canReachLocalSupabase(apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/auth/v1/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function getLocalSupabaseEnv() {
  if (process.env.LUMACRAFT_FORCE_NO_LOCAL_SUPABASE === "true") {
    throw new Error("Forced local Supabase unavailability for testing.");
  }

  try {
    const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
    const output = execFileSync(npxCommand, ["supabase", "status", "-o", "env"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    const parsed = {};

    for (const line of output.split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);

      if (!match) {
        continue;
      }

      const [, key, value] = match;
      parsed[key] = value;
    }

    const apiUrl = parsed.API_URL;
    const publishableKey = parsed.PUBLISHABLE_KEY ?? parsed.ANON_KEY;
    const serviceRoleKey = parsed.SECRET_KEY ?? parsed.SERVICE_ROLE_KEY;

    if (!apiUrl || !publishableKey || !serviceRoleKey) {
      throw new Error(
        "Unable to resolve local Supabase credentials from `supabase status -o env`.",
      );
    }

    return {
      ...parsed,
      NEXT_PUBLIC_SUPABASE_URL: apiUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      SUPABASE_SERVICE_ROLE_JWT: parsed.SERVICE_ROLE_KEY ?? "",
      ENABLE_TEST_AUTH: "true",
    };
  } catch (statusError) {
    const fallbackEnv = buildFallbackLocalEnv();

    if (await canReachLocalSupabase(fallbackEnv.API_URL)) {
      return fallbackEnv;
    }

    throw statusError;
  }
}

function getCommandAndArgs(argv) {
  if (argv.length === 0) {
    throw new Error("Usage: node scripts/with-local-supabase-env.mjs <command> [...args]");
  }

  if (argv[0] !== "env") {
    return {
      command: argv[0],
      args: argv.slice(1),
      env: {},
    };
  }

  const extraEnv = {};
  let index = 1;

  while (index < argv.length && argv[index].includes("=")) {
    const [key, ...valueParts] = argv[index].split("=");
    extraEnv[key] = valueParts.join("=");
    index += 1;
  }

  if (index >= argv.length) {
    throw new Error("Expected a command after env assignments.");
  }

  return {
    command: argv[index],
    args: argv.slice(index + 1),
    env: extraEnv,
  };
}

function isPlaywrightCommand(command, args) {
  return command === "playwright" || (command === "npx" && args[0] === "playwright");
}

function logSkip(message) {
  console.warn(`[with-local-supabase-env] ${message}`);
}

function runCommand(command, args, env) {
  const child = spawn(command, args, {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });
}

async function main() {
  const { command, args, env } = getCommandAndArgs(process.argv.slice(2));
  const baseEnv = {
    ...process.env,
    ...env,
  };

  try {
    const localEnv = await getLocalSupabaseEnv();

    runCommand(command, args, {
      ...baseEnv,
      ...localEnv,
      LOCAL_SUPABASE_AVAILABLE: "true",
    });
  } catch {
    if (isPlaywrightCommand(command, args)) {
      logSkip("Local Supabase is not available. Skipping Playwright suite.");
      process.exit(0);
      return;
    }

    logSkip("Local Supabase is not available. Running command without local test env.");

    runCommand(command, args, {
      ...baseEnv,
      LOCAL_SUPABASE_AVAILABLE: "false",
    });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
