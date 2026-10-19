import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

export const ADMIN = { email: 'admin@test.example', password: 'test-admin-password-123', name: 'Admin' }
export const AGENT = { email: 'agent@test.example', password: 'test-agent-password-123', name: 'Test Agent' }

let agentEnsured = false

// Creates the agent in the test DB (idempotent); runs the server-side script once per worker.
// Playwright loads test files as CommonJS (no import.meta) and may run under Node or Bun, so use
// __dirname and node:child_process rather than Bun-only APIs.
export function ensureAgent() {
  if (agentEnsured) return
  execFileSync('bun', ['scripts/ensure-test-agent.ts'], {
    cwd: resolve(__dirname, '../../server'),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  agentEnsured = true
}
