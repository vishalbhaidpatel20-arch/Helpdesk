import { TicketStatus } from '@helpdesk/core'
import type { InboundEmailInput } from '@helpdesk/core'
import { prisma } from '../db'
import { findAiAgentId } from './aiAgent'
import { enqueueProcessTicket } from './queue'

// Prisma's "Unique constraint failed" error
function isUniqueViolation(err: unknown) {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002'
}

// Shared by the inbound-email webhook and the SMTP server: turns a validated support email into a ticket
export async function createTicketFromEmail(email: InboundEmailInput) {
  const data = {
    subject: email.subject,
    body: email.text,
    senderName: email.senderName,
    senderEmail: email.senderEmail,
    messageId: email.messageId,
  }

  // A repeated Message-ID (provider or sender retry) returns the existing ticket instead of creating a duplicate
  if (email.messageId) {
    const existing = await prisma.ticket.findUnique({
      where: { messageId: email.messageId },
      select: { id: true },
    })
    if (existing) return { ticket: existing, created: false }
  }

  // Without an AI key nothing can process the ticket, so it is opened for the agents right away. Otherwise it is
  // NEW (hidden from the list) until a pg-boss worker has classified it and tried to resolve it.
  const aiEnabled = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  const status = aiEnabled ? TicketStatus.NEW : TicketStatus.OPEN
  // The AI agent (if seeded) owns the ticket while it tries to resolve it; it is unassigned if it cannot
  const assignedToId = aiEnabled ? await findAiAgentId() : null
  let ticket: { id: number }
  try {
    ticket = await prisma.ticket.create({ data: { ...data, status, assignedToId }, select: { id: true } })
  } catch (err) {
    // Two deliveries of the same email at the same moment (e.g. a provider retry racing the IMAP poll) both pass the
    // check above; the unique constraint stops the second one, which then returns the ticket the first created
    if (email.messageId && isUniqueViolation(err)) {
      const existing = await prisma.ticket.findUnique({ where: { messageId: email.messageId }, select: { id: true } })
      if (existing) return { ticket: existing, created: false }
    }
    throw err
  }
  if (aiEnabled) await enqueueProcessTicket(ticket.id)
  return { ticket, created: true }
}
