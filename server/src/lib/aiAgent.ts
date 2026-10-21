import { Role } from '../../generated/enums'
import { prisma } from '../db'

export const AI_AGENT_NAME = 'AI'
export const AI_AGENT_EMAIL = 'ai@helpdesk.local'

// The id of the seeded AI agent (`bun run --cwd server db:seed:ai`), or null when it has not been created
export async function findAiAgentId() {
  const agent = await prisma.user.findFirst({
    where: { email: AI_AGENT_EMAIL, role: Role.AGENT, deletedAt: null },
    select: { id: true },
  })
  return agent?.id ?? null
}
