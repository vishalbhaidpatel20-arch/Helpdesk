import { createHash, timingSafeEqual } from 'node:crypto'
import { inboundEmailSchema, TicketStatus } from '@helpdesk/core'
import { Router } from 'express'
import { prisma } from '../db'
import { parseBody } from '../lib/parseBody'
import { findAiAgentId } from '../lib/aiAgent'
import { enqueueProcessTicket } from '../lib/queue'

export const webhooksRouter = Router()

// Hash both sides so the comparison is constant-time even when the lengths differ
function secretMatches(provided: string | undefined, expected: string) {
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(provided ?? ''), digest(expected))
}

// Server-to-server, so no session: authenticated by the shared secret in INBOUND_EMAIL_SECRET.
// Provider adapters (SendGrid, Mailgun) will map their payloads onto inboundEmailSchema.
webhooksRouter.post('/inbound-email', async (req, res) => {
  const secret = process.env.INBOUND_EMAIL_SECRET
  if (!secret) {
    res.status(503).json({ error: 'Inbound email is not configured' })
    return
  }
  if (!secretMatches(req.get('x-webhook-secret'), secret)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const email = parseBody(inboundEmailSchema, req, res)
  if (!email) return

  const data = {
    subject: email.subject,
    body: email.text,
    senderName: email.senderName,
    senderEmail: email.senderEmail,
    messageId: email.messageId,
  }

  
  // A repeated Message-ID (provider retry) returns the existing ticket instead of creating a duplicate
  if (email.messageId) {
    const existing = await prisma.ticket.findUnique({
      where: { messageId: email.messageId },
      select: { id: true },
    })
    if (existing) {
      res.status(200).json({ ticket: existing })
      return
    }
  }

  // Without an AI key nothing can process the ticket, so it is opened for the agents right away. Otherwise it is
  // NEW (hidden from the list) until a pg-boss worker has classified it and tried to resolve it.
  const aiEnabled = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  const status = aiEnabled ? TicketStatus.NEW : TicketStatus.OPEN
  // The AI agent (if seeded) owns the ticket while it tries to resolve it; it is unassigned if it cannot
  const assignedToId = aiEnabled ? await findAiAgentId() : null
  const ticket = await prisma.ticket.create({ data: { ...data, status, assignedToId }, select: { id: true } })
  if (aiEnabled) await enqueueProcessTicket(ticket.id)
  res.status(201).json({ ticket })
})
