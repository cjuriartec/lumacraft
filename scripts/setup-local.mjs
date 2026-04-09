#!/usr/bin/env node
/**
 * 🚀 Lumacraft — Setup Local Supabase (Ironclad Version)
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { pathToFileURL } from "node:url";

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

export function parseStatusEnv(output) {
  const parsed = {};

  for (const line of output.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);

    if (match) {
      parsed[match[1]] = match[2];
    }
  }

  return parsed;
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

export async function canReuseRunningSupabase(env, serviceChecker = checkService) {
  if (!env?.API_URL) {
    return false;
  }

  const authHealth = await serviceChecker(`${env.API_URL}/auth/v1/health`);
  return authHealth.ok;
}

function getEnvFromStatus() {
  try {
    const output = runCLI(["status", "-o", "env"], { silent: true });
    return parseStatusEnv(output);
  } catch {
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${C.bold}${C.cyan}🚀 Lumacraft — Setup Local Supabase${C.reset}`);
  log.separator();

  const { apiPort, studioPort } = readConfig();

  // ── Paso 1: Iniciar Supabase ───────────────────────────────────────────────
  log.step(1, "Iniciando contenedores Docker de Supabase...");
  let env = getEnvFromStatus();
  const fallbackApiUrl = `http://127.0.0.1:${apiPort}`;
  const isRunning = await canReuseRunningSupabase(env);

  if (isRunning) {
    log.ok("Supabase ya está corriendo. Continuando...");
  } else {
    if (env?.API_URL) {
      log.info(
        "La API local aun no responde. Ejecutando `supabase start` para esperar el arranque...",
      );
    } else {
      log.info("Levantando contenedores (puede tardar 30-60s la primera vez)...");
    }

    try {
      runCLI(["start"]);
      log.ok("Contenedores listos.");
    } catch {
      log.err("Error al iniciar Supabase. ¿Está Docker corriendo?");
      process.exit(1);
    }
    env = getEnvFromStatus();
  }

  const apiUrl = env?.API_URL || fallbackApiUrl;

  // ── Paso 2: Resolver endpoints ─────────────────────────────────────────────
  log.step(2, "Resolviendo endpoints locales...");
  log.ok(`API disponible en ${apiUrl}`);

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

  const publishableKey = env?.PUBLISHABLE_KEY ?? env?.ANON_KEY;
  const secretKey = env?.SECRET_KEY ?? env?.SUPABASE_SECRET_KEY;

  console.log(`
${C.bold}📋 Variables para .env.local (modo local):${C.reset}

${C.cyan}NEXT_PUBLIC_SUPABASE_URL${C.reset}=${apiUrl}
${C.cyan}NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY${C.reset}=${publishableKey}
${C.cyan}SUPABASE_SECRET_KEY${C.reset}=${secretKey}

${C.bold}🔐 AI Settings:${C.reset}
${C.cyan}AI_SETTINGS_MASTER_KEY${C.reset}=define-una-clave-maestra-segura-para-cifrar-secrets-ai

${C.bold}🌐 Interfaces:${C.reset}
  ${C.green}API:${C.reset}         ${apiUrl}
  ${C.green}Studio:${C.reset}      http://127.0.0.1:${studioPort}
  ${C.green}Inbucket:${C.reset}    http://127.0.0.1:54324 ${C.gray}(emails de prueba)${C.reset}
`);

  log.separator();
  console.log(`${C.bold}${C.green}✅ Entorno listo.${C.reset}\n`);
}

const isDirectExecution =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectExecution) {
  main().catch((err) => {
    log.err(err.message ?? err);
    process.exit(1);
  });
}
