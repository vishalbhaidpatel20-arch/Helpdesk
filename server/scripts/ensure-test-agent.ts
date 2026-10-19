// Idempotently creates the AGENT user for e2e tests in the isolated test database.
// Usage (from server/): bun scripts/ensure-test-agent.ts
import path from 'node:path'
import dotenv from 'dotenv'

process.env.NODE_ENV = 'test'
dotenv.config({ path: path.resolve(import.meta.dir, '..', '.env.test'), override: true })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is not set in server/.env.test')
const dbName = new URL(databaseUrl).pathname.slice(1)
if (!dbName.endsWith('_test')) {
  throw new Error(`Refusing to touch "${dbName}": test database name must end in "_test"`)
}

const email = process.env.SEED_AGENT_EMAIL ?? 'agent@test.example'
const password = process.env.SEED_AGENT_PASSWORD ?? 'test-agent-password-123'

// Import after env is loaded: auth.ts and db.ts read process.env at import time
const { auth } = await import('../src/auth')
const { prisma } = await import('../src/db')
const { Role } = await import('../generated/enums')

const ctx = await auth.$context
const existing = await prisma.user.findUnique({ where: { email } })
if (existing) {
  console.log(`Agent ${email} already exists, skipping`)
} else {
  const user = await ctx.internalAdapter.createUser({
    email,
    name: 'Test Agent',
    emailVerified: true,
    role: Role.AGENT,
  })
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: await ctx.password.hash(password),
  })
  console.log(`Created agent ${email}`)
}
await prisma.$disconnect()
