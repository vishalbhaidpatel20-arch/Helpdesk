import { TicketStatus } from '@helpdesk/core'
import { prisma } from '../db'
import { autoResolveTicket, openTicket } from './autoResolveTicket'
import { classifyAndSaveTicket } from './classifyTicket'
import { reportError } from './reportError'

// Job handler (see queue.ts): runs the two independent steps for a ticket, classification and auto-resolve.
// A new ticket moves NEW -> PROCESSING -> RESOLVED or OPEN. If any step fails (e.g. generateText throws), the ticket
// is opened for the agents right away instead of staying hidden, and the job completes without retrying.
export async function processTicket(id: number) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { subject: true, body: true, senderName: true, senderEmail: true, messageId: true, category: true, status: true },
  })
  if (!ticket) return
  const isWorking = ticket.status === TicketStatus.NEW || ticket.status === TicketStatus.PROCESSING

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    if (isWorking) await openTicket(id)
    return
  }

  try {
    if (isWorking) {
      await prisma.ticket.updateMany({
        where: { id, status: { in: [TicketStatus.NEW, TicketStatus.PROCESSING] } },
        data: { status: TicketStatus.PROCESSING },
      })
    }
    if (!ticket.category) await classifyAndSaveTicket(id, ticket)
    // Tickets that are already past NEW (e.g. the backfill script) are only classified
    if (isWorking) await autoResolveTicket(id, ticket)
  } catch (err) {
    reportError(`Ticket ${id}: processing failed, opening it`, err)
    if (isWorking) await openTicket(id)
  }
}
