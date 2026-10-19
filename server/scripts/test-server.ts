// Starts the API against the isolated test database for Playwright e2e runs.
// Loads .env.test (overriding .env), resets and seeds the test database, then boots the server.
import path from 'node:path'
import dotenv from 'dotenv'

const serverDir = path.resolve(import.meta.dir, '..')

process.env.NODE_ENV = 'test'
dotenv.config({ path: path.join(serverDir, '.env.test'), override: true })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set in server/.env.test')
}

// Guard: `prisma migrate reset` wipes the database, so refuse anything not clearly a test DB
const dbName = new URL(databaseUrl).pathname.slice(1)
if (!dbName.endsWith('_test')) {
  throw new Error(`Refusing to reset "${dbName}": test database name must end in "_test"`)
}

async function run(cmd: string[]) {
  const proc = Bun.spawn(cmd, { cwd: serverDir, env: process.env, stdout: 'inherit', stderr: 'inherit' })
  if ((await proc.exited) !== 0) {
    throw new Error(`Command failed: ${cmd.join(' ')}`)
  }
}

console.log(`Resetting test database "${dbName}"`)
await run(['bunx', 'prisma', 'migrate', 'reset', '--force'])
await run(['bun', 'prisma/seed.ts'])

// Import after env is loaded: auth.ts and db.ts read process.env at import time
await import('../src/index')
