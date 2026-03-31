#!/usr/bin/env node
/**
 * 🚀 Lumacraft — Setup Local Supabase
 * 
 * Levanta el entorno local completo de Supabase:
 *   1. Inicia los contenedores Docker de Supabase
 *   2. Espera a que la API esté disponible
 *   3. Aplica todas las migraciones pendientes
 *   4. Ejecuta el seed inicial
 *   5. Imprime un resumen con las credenciales locales
 *
 * Uso:
 *   node scripts/setup-local.mjs
 *   npm run supabase:local
 */

import { execFileSync, execSync } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'

// ─── Colores para la terminal ─────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
}

const log = {
  step: (n, msg) => console.log(`\n${C.bold}${C.cyan}[${n}]${C.reset} ${msg}`),
  ok: (msg) => console.log(`    ${C.green}✓${C.reset} ${msg}`),
  warn: (msg) => console.log(`    ${C.yellow}⚠${C.reset} ${msg}`),
  err: (msg) => console.error(`    ${C.red}✗${C.reset} ${msg}`),
  info: (msg) => console.log(`    ${C.gray}→${C.reset} ${msg}`),
  separator: () => console.log(`\n${C.dim}${'─'.repeat(60)}${C.reset}`),
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function runCLI(args, { silent = false } = {}) {
  return execFileSync('npx', ['supabase', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: silent ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  })
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64')
    .replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_')
}

function signJwt(payload, secret) {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const pl = base64UrlEncode(JSON.stringify(payload))
  const sig = createHmac('sha256', secret)
    .update(`${header}.${pl}`).digest('base64')
    .replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_')
  return `${header}.${pl}.${sig}`
}

function readConfig() {
  const configPath = path.resolve(process.cwd(), 'supabase/config.toml')
  const config = readFileSync(configPath, 'utf8')
  const apiPortMatch = config.match(/\[api\][\s\S]*?port\s*=\s*(\d+)/m)
  const studioPortMatch = config.match(/\[studio\][\s\S]*?port\s*=\s*(\d+)/m)
  return {
    apiPort: apiPortMatch?.[1] ?? '54321',
    studioPort: studioPortMatch?.[1] ?? '54323',
  }
}

async function waitForSupabase(apiUrl, maxAttempts = 30) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const res = await fetch(`${apiUrl}/auth/v1/health`)
      if (res.ok) return true
    } catch {}
    if (i < maxAttempts) {
      process.stdout.write(`\r    ${C.gray}Esperando Supabase... (${i}/${maxAttempts})${C.reset}`)
      await new Promise(r => setTimeout(r, 2000))
    }
  }
  process.stdout.write('\n')
  return false
}

function getEnvFromStatus() {
  try {
    const output = runCLI(['status', '-o', 'env'], { silent: true })
    const parsed = {}
    for (const line of output.split('\n')) {
      const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/)
      if (match) parsed[match[1]] = match[2]
    }
    return parsed
  } catch {
    return null
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${C.bold}${C.cyan}🚀 Lumacraft — Setup Local Supabase${C.reset}`)
  log.separator()

  const { apiPort, studioPort } = readConfig()
  const apiUrl = `http://127.0.0.1:${apiPort}`
  const jwtSecret = 'super-secret-jwt-token-with-at-least-32-characters-long'

  // ── Paso 1: Iniciar Supabase ───────────────────────────────────────────────
  log.step(1, 'Iniciando contenedores Docker de Supabase...')
  try {
    // Intenta iniciar silenciosamente para detectar si ya está corriendo
    const status = runCLI(['status', '-o', 'env'], { silent: true })
    if (status.includes('API_URL')) {
      log.ok('Supabase ya está corriendo. Continuando...')
    }
  } catch {
    log.info('Levantando contenedores (puede tardar 30-60s la primera vez)...')
    try {
      runCLI(['start'])
      log.ok('Contenedores iniciados.')
    } catch (err) {
      log.err('Error al iniciar Supabase. ¿Está Docker corriendo?')
      log.info('Ejecuta: open -a Docker  /  (o inicia Docker Desktop manualmente)')
      process.exit(1)
    }
  }

  // ── Paso 2: Esperar API ────────────────────────────────────────────────────
  log.step(2, `Esperando que la API responda en ${apiUrl}...`)
  const ready = await waitForSupabase(apiUrl)
  if (!ready) {
    log.err(`La API no respondió después de 60 segundos.`)
    log.info('Verifica Docker o intenta: npx supabase start')
    process.exit(1)
  }
  console.log('')
  log.ok(`API disponible en ${apiUrl}`)

  // ── Paso 3: Aplicar migraciones ───────────────────────────────────────────
  log.step(3, 'Aplicando migraciones de base de datos...')
  try {
    runCLI(['db', 'reset', '--local'], { silent: false })
    log.ok('Migraciones aplicadas y base de datos reseteada.')
  } catch {
    log.warn('No se pudo resetear. Intentando solo push de migraciones...')
    try {
      execFileSync('npx', ['supabase', 'db', 'push', '--local'], {
        cwd: process.cwd(),
        stdio: 'inherit',
      })
      log.ok('Migraciones aplicadas.')
    } catch (err) {
      log.err('Error aplicando migraciones:')
      console.error(err.message)
    }
  }

  // ── Paso 4: Resumen de credenciales ───────────────────────────────────────
  log.step(4, 'Obteniendo credenciales locales...')
  log.separator()
  
  const env = getEnvFromStatus()
  const anonKey = env?.ANON_KEY ?? signJwt({ iss: 'supabase-demo', role: 'anon', exp: 1983812996 }, jwtSecret)
  const serviceKey = env?.SERVICE_ROLE_KEY ?? signJwt({ iss: 'supabase-demo', role: 'service_role', exp: 1983812996 }, jwtSecret)

  console.log(`
${C.bold}📋 Variables para .env.local (modo local):${C.reset}

${C.cyan}NEXT_PUBLIC_SUPABASE_URL${C.reset}=${apiUrl}
${C.cyan}NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY${C.reset}=${anonKey}
${C.cyan}SUPABASE_SERVICE_ROLE_KEY${C.reset}=${serviceKey}

${C.bold}🌐 Interfaces:${C.reset}
  ${C.green}API:${C.reset}         ${apiUrl}
  ${C.green}Studio:${C.reset}      http://127.0.0.1:${studioPort}
  ${C.green}Inbucket:${C.reset}    http://127.0.0.1:54324 ${C.gray}(emails de prueba)${C.reset}
`)

  log.separator()
  console.log(`${C.bold}${C.green}✅ Entorno local listo. Ahora puedes ejecutar:${C.reset}`)
  console.log(`\n   ${C.cyan}npm run dev${C.reset}\n`)
  console.log(`${C.dim}   Tip: Para resetear datos: npm run supabase:clean${C.reset}`)
  console.log(`${C.dim}   Usa el Studio en http://127.0.0.1:${studioPort} para explorar la BD${C.reset}\n`)
}

main().catch((err) => {
  log.err(err.message ?? err)
  process.exit(1)
})
