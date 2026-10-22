import { TicketStatus } from '@helpdesk/core'
import { prisma } from '../db'
import { findAiAgentId } from './aiAgent'
import { loadKnowledgeBase } from './knowledgeBase'
import { resolveTicket } from './resolveTicket'
import { sendReplyEmail } from './sendEmail'

const working = { in: [TicketStatus.NEW, TicketStatus.PROCESSING] }

// Hand a ticket the AI could not settle to the agents, unless someone already changed its status: it becomes OPEN
// and, if it is still assigned to the AI agent, is unassigned
export async function openTicket(id: number) {
  const { count } = await prisma.ticket.updateMany({ where: { id, status: working }, data: { status: TicketStatus.OPEN } })
  if (!count) return
  const aiAgentId = await findAiAgentId()
  if (aiAgentId) await prisma.ticket.updateMany({ where: { id, assignedToId: aiAgentId }, data: { assignedToId: null } })
}

// Auto-resolve step of the ticket pipeline, independent of classification: answer the ticket from the knowledge
// base. On success the reply is emailed to the customer (when sending is configured) and the ticket becomes RESOLVED
// with the AI's reply (no author), staying assigned to the AI agent; when the knowledge base cannot answer it
// (or the file is missing) it becomes OPEN. Provider and mail errors propagate to the caller, which opens the ticket
// for the agents: nothing is saved as resolved that the customer never received.
export async function autoResolveTicket(
  id: number,
  ticket: { subject: string; body: string; senderName: string; senderEmail: string; messageId: string | null },
  sendEmail: typeof sendReplyEmail = sendReplyEmail,
) {
  const knowledgeBase = await loadKnowledgeBase()
  const reply = knowledgeBase ? await resolveTicket(ticket, knowledgeBase) : null
  if (!reply) {
    await openTicket(id)
    return
  }
  await sendEmail(ticket, reply)
  // Resolve only while still PROCESSING, so an agent's change in the meantime is not overwritten
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.ticket.updateMany({
      where: { id, status: TicketStatus.PROCESSING },
      data: { status: TicketStatus.RESOLVED, resolvedAt: new Date() },
    })
    if (count) await tx.reply.create({ data: { ticketId: id, authorId: null, body: reply } })
  })
}
