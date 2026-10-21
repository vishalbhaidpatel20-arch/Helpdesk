// Creates the agent named "AI" that new tickets are assigned to while the AI tries to resolve them.
// It has no credential account, so nobody can sign in as it. Idempotent.
import 'dotenv/config'
import { auth } from '../src/auth'
import { Role } from '../generated/enums'
import { prisma } from '../src/db'
import { AI_AGENT_EMAIL, AI_AGENT_NAME } from '../src/lib/aiAgent'

const existing = await prisma.user.findUnique({ where: { email: AI_AGENT_EMAIL } })

if (existing) {
  console.log(`AI agent ${AI_AGENT_EMAIL} already exists${existing.deletedAt ? ' (deleted)' : ''}, skipping`)
} else {
  const ctx = await auth.$context
  // Go through the internal adapter since public sign-up is disabled
  await ctx.internalAdapter.createUser({
    email: AI_AGENT_EMAIL,
    name: AI_AGENT_NAME,
    emailVerified: true,
    role: Role.AGENT,
  })
  console.log(`Created AI agent ${AI_AGENT_EMAIL}`)
}

await prisma.$disconnect()
