import path from 'node:path'

export const E2E_AUTH_DIR = path.resolve(process.cwd(), 'playwright/.auth')
export const AUTH_STATE_PATH = path.join(E2E_AUTH_DIR, 'user.json')
export const AUTH_META_PATH = path.join(E2E_AUTH_DIR, 'user.meta.json')

