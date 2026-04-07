#!/usr/bin/env node
/**
 * 🚀 Lumacraft — Setup Local Supabase (Ironclad Version)
 */

import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";

// ─── Colores para la terminal ─────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

const log = {
  step: (n, msg) => console.log(`\n${C.bold}${C.cyan}[${n}]${C.reset} ${msg}`),
  ok: (msg) => console.log(`    ${C.green}✓${C.reset} ${msg}`),
  warn: (msg) => console.log(`    ${C.yellow}⚠${C.reset} ${msg}`),
  err: (msg) => console.error(`    ${C.red}✗${C.reset} ${msg}`),
  info: (msg) => console.log(`    ${C.gray}→${C.reset} ${msg}`),
  separator: () => console.log(`\n${C.dim}${"─".repeat(60)}${C.reset}`),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function runCLI(args, { silent = false } = {}) {
  return execFileSync("npx", ["supabase", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: silent ? ["ignore", "pipe", "pipe"] : "inherit",
  });
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");
}

function signJwt(payload, secret) {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const pl = base64UrlEncode(JSON.stringify(payload));
  const sig = createHmac("sha256", secret)
    .update(`${header}.${pl}`)
    .digest("base64")
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");
  return `${header}.${pl}.${sig}`;
}

function readConfig() {
  const configPath = path.resolve(process.cwd(), "supabase/config.toml");
  const config = readFileSync(configPath, "utf8");
  const apiPortMatch = config.match(/\[api\][\s\S]*?port\s*=\s*(\d+)/m);
  const studioPortMatch = config.match(/\[studio\][\s\S]*?port\s*=\s*(\d+)/m);
  return {
    apiPort: apiPortMatch?.[1] ?? "54321",
    studioPort: studioPortMatch?.[1] ?? "54323",
  };
}

async function checkService(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, (res) => {
      const isRest = url.includes("/rest/v1");
      const ok = isRest ? res.statusCode < 500 : res.statusCode >= 200 && res.statusCode < 300;
      resolve({ ok, status: res.statusCode });
    });
    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ ok: false, error: "timeout" });
    });
    req.end();
  });
}

async function waitForSupabase(apiUrl, maxAttempts = 60) {
  const services = [
    { name: "Auth", url: `${apiUrl}/auth/v1/health` },
    { name: "Storage", url: `${apiUrl}/storage/v1/health` },
    { name: "Rest", url: `${apiUrl}/rest/v1/` },
  ];

  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const results = await Promise.all(
        services.map((s) => checkService(s.url).then((r) => ({ ...s, ...r }))),
      );

      if (results.every((r) => r.ok)) return true;

      const failures = results.filter((r) => !r.ok);
      const failMsg = failures.map((f) => `${f.name}:${f.status || f.error}`).join(", ");
      console.log(`    ${C.gray}[${i}/${maxAttempts}] Esperando: ${failMsg}...${C.reset}`);
    } catch (e) {
      console.log(
        `    ${C.gray}[${i}/${maxAttempts}] Error en health check: ${e.message}${C.reset}`,
      );
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

function getEnvFromStatus() {
  try {
    const output = runCLI(["status", "-o", "env"], { silent: true });
    const parsed = {};
    for (const line of output.split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
      if (match) parsed[match[1]] = match[2];
    }
    return parsed;
  } catch {
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${C.bold}${C.cyan}🚀 Lumacraft — Setup Local Supabase${C.reset}`);
  log.separator();

  const { apiPort, studioPort } = readConfig();
  const jwtSecret = "super-secret-jwt-token-with-at-least-32-characters-long";

  // ── Paso 1: Iniciar Supabase ───────────────────────────────────────────────
  log.step(1, "Iniciando contenedores Docker de Supabase...");
  let env = getEnvFromStatus();

  if (env?.API_URL) {
    log.ok("Supabase ya está corriendo. Continuando...");
  } else {
    log.info("Levantando contenedores (puede tardar 30-60s la primera vez)...");
    try {
      runCLI(["start"]);
      log.ok("Contenedores iniciados.");
    } catch {
      log.err("Error al iniciar Supabase. ¿Está Docker corriendo?");
      process.exit(1);
    }
    env = getEnvFromStatus();
  }

  const apiUrl = env?.API_URL || `http://127.0.0.1:${apiPort}`;

  // ── Paso 2: Esperar API ────────────────────────────────────────────────────
  log.step(2, `Esperando servicios en ${apiUrl}...`);
  const ready = await waitForSupabase(apiUrl);
  if (!ready) {
    log.err(`La API no respondió correctamente.`);
    log.info("Intenta: npx supabase stop --no-backup && npm run supabase:local");
    process.exit(1);
  }
  log.ok(`Servicios disponibles en ${apiUrl}`);

  // ── Paso 3: Aplicar migraciones ───────────────────────────────────────────
  log.step(3, "Aplicando migraciones y preparando base de datos...");
  try {
    // Intentar reset normal primero
    runCLI(["db", "reset", "--local"], { silent: false });
    log.ok("Base de datos reseteada y poblada.");
  } catch {
    log.warn("El reset falló. Intentando recuperación manual...");
    try {
      // Forzar push de migraciones
      runCLI(["db", "push", "--local"], { silent: false });
      log.ok("Migraciones aplicadas (push).");
      // Intentar reset parcial solo para seeds (esto a veces funciona mejor tras el push)
      log.info("Reintentando reset para cargar semillas...");
      runCLI(["db", "reset", "--local"], { silent: true });
      log.ok("Semillas cargadas.");
    } catch {
      log.err("No se pudo completar la inicialización de la BD.");
    }
  }

  // ── Paso 4: Resumen de credenciales ───────────────────────────────────────
  log.step(4, "Obteniendo credenciales finales...");
  log.separator();

  env = getEnvFromStatus();
  const anonKey =
    env?.ANON_KEY ?? signJwt({ iss: "supabase-demo", role: "anon", exp: 1983812996 }, jwtSecret);
  const serviceKey =
    env?.SERVICE_ROLE_KEY ??
    signJwt({ iss: "supabase-demo", role: "service_role", exp: 1983812996 }, jwtSecret);

  console.log(`
${C.bold}📋 Variables para .env.local (modo local):${C.reset}

${C.cyan}NEXT_PUBLIC_SUPABASE_URL${C.reset}=${apiUrl}
${C.cyan}NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY${C.reset}=${anonKey}
${C.cyan}SUPABASE_SERVICE_ROLE_KEY${C.reset}=${serviceKey}

${C.bold}🌐 Interfaces:${C.reset}
  ${C.green}API:${C.reset}         ${apiUrl}
  ${C.green}Studio:${C.reset}      http://127.0.0.1:${studioPort}
  ${C.green}Inbucket:${C.reset}    http://127.0.0.1:54324 ${C.gray}(emails de prueba)${C.reset}
`);

  log.separator();
  console.log(`${C.bold}${C.green}✅ Entorno listo.${C.reset}\n`);
}

main().catch((err) => {
  log.err(err.message ?? err);
  process.exit(1);
});
