import { inboundEmailSchema } from '@helpdesk/core'
import { createTicketFromEmail } from './createTicketFromEmail'

export type EmailAddress = { name: string; address: string }

export type EmailAttachment = {
  filename?: string
  contentType: string
  size: number
  content: Buffer
}

// An email received over SMTP after `simpleParser` (see smtpServer.ts)
export type ParsedEmail = {
  from: EmailAddress[]
  to: EmailAddress[]
  cc: EmailAddress[]
  subject?: string
  date?: Date
  messageId?: string
  text?: string
  html?: string
  attachments: EmailAttachment[]
}

// The email can never become a ticket (e.g. no usable sender); resending it will not help
export class InvalidEmailError extends Error {}

// Limits from inboundEmailSchema: longer values are cut instead of dropping the customer's email
const MAX_SUBJECT = 255
const MAX_NAME = 200
const MAX_BODY = 50_000

// Same logic the inbound-email webhook runs, fed from SMTP. Tickets store plain text only, so the HTML body and the
// attachments are not saved (there is no place for them yet).
export async function handleIncomingEmail(email: ParsedEmail) {
  const sender = email.from[0]
  if (!sender) throw new InvalidEmailError('Email has no sender')

  const parsed = inboundEmailSchema.safeParse({
    senderEmail: sender.address,
    senderName: (sender.name || sender.address).slice(0, MAX_NAME),
    subject: (email.subject ?? '').slice(0, MAX_SUBJECT),
    text: email.text?.trim().slice(0, MAX_BODY) || '(no text content)',
    messageId: email.messageId,
  })
  if (!parsed.success) throw new InvalidEmailError(parsed.error.issues[0]!.message)

  const { ticket, created } = await createTicketFromEmail(parsed.data)
  return { ticketId: ticket.id, created }
}
