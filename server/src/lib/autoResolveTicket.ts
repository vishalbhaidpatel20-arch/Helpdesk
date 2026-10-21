 import { TicketStatus } from '@helpdesk/core'
import { prisma } from '../db'
import { loadKnowledgeBase } from './knowledgeBase'
import { resolveTicket } from './resolveTicket'

const working = { in: [TicketStatus.NEW, TicketStatus.PROCESSING] }

// Hand a ticket the AI could not settle to the agents, unless someone already changed its status
export function openTicket(id: number) {
  return prisma.ticket.updateMany({ where: { id, status: working }, data: { status: TicketStatus.OPEN } })
}

// Auto-resolve step of the ticket pipeline, independent of classification: answer the ticket from the knowledge
// base. On success it becomes RESOLVED with the AI's reply (no author); when the knowledge base cannot answer it
// (or the file is missing) it becomes OPEN. Provider errors propagate to the caller.
export async function autoResolveTicket(id: number, ticket: { subject: string; body: string; senderName: string }) {
  const knowledgeBase = await loadKnowledgeBase()
  const reply = knowledgeBase ? await resolveTicket(ticket, knowledgeBase) : null
  if (!reply) {
    await openTicket(id)
    return
  }
  // Resolve only while still PROCESSING, so an agent's change in the meantime is not overwritten
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.ticket.updateMany({
      where: { id, status: TicketStatus.PROCESSING },
      data: { status: TicketStatus.RESOLVED },
    })
    if (count) await tx.reply.create({ data: { ticketId: id, authorId: null, body: reply } })
  })
}
