import { createHash, timingSafeEqual } from 'node:crypto'
import { inboundEmailSchema } from '@helpdesk/core'
import { Router } from 'express'
import { createTicketFromEmail } from '../lib/createTicketFromEmail'
import { parseBody } from '../lib/parseBody'

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

  const { ticket, created } = await createTicketFromEmail(email)
  res.status(created ? 201 : 200).json({ ticket })
})
