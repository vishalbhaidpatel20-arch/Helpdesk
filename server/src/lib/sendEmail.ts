import { createTransport } from 'nodemailer'
import type { Transporter } from 'nodemailer'

export type MailConfig = {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

// Sending is on when there is a mailbox to send from: MAIL_USER, or the IMAP_USER already used for receiving.
// The password defaults to SMTP_PASSWORD (a Gmail app password works for SMTP and IMAP alike). The MAIL_ prefix
// keeps these apart from SMTP_PORT / SMTP_DOMAIN, which belong to the inbound SMTP server.
export function readMailConfig(): MailConfig | undefined {
  const user = (process.env.MAIL_USER ?? process.env.IMAP_USER)?.trim()
  if (!user) return undefined
  // App passwords are shown in groups ("abcd efgh ..."), but the spaces are not part of the password
  const pass = (process.env.MAIL_PASSWORD ?? process.env.SMTP_PASSWORD ?? '').replace(/\s+/g, '')
  if (!pass) throw new Error('Sending email needs MAIL_PASSWORD or SMTP_PASSWORD')
  const port = Number(process.env.MAIL_PORT ?? 465)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid MAIL_PORT: ${process.env.MAIL_PORT}`)
  return {
    host: process.env.MAIL_HOST?.trim() || 'smtp.gmail.com',
    port,
    user,
    pass,
    from: process.env.MAIL_FROM?.trim() || user,
  }
}

type ReplyTicket = { subject: string; senderName: string; senderEmail: string; messageId: string | null }

// Answers the customer's email in the same conversation: "Re:" subject plus In-Reply-To / References, which is
// what mail clients use to thread the messages
export function buildReplyEmail(ticket: ReplyTicket, body: string, from: string) {
  const messageId = ticket.messageId && (ticket.messageId.startsWith('<') ? ticket.messageId : `<${ticket.messageId}>`)
  return {
    from,
    to: { name: ticket.senderName, address: ticket.senderEmail },
    subject: /^re:/i.test(ticket.subject) ? ticket.subject : `Re: ${ticket.subject}`,
    text: body,
    ...(messageId ? { inReplyTo: messageId, references: messageId } : {}),
  }
}

let cached: { key: string; transporter: Transporter } | undefined

function transporterFor(config: MailConfig) {
  const key = JSON.stringify(config)
  if (cached?.key !== key) {
    cached = {
      key,
      transporter: createTransport({
        host: config.host,
        port: config.port,
        // Port 465 is TLS from the start; other ports (587) upgrade with STARTTLS
        secure: config.port === 465,
        auth: { user: config.user, pass: config.pass },
      }),
    }
  }
  return cached.transporter
}

// Emails an agent's reply to the customer. Returns false when sending is not configured (nothing is sent) and
// throws when the mail server refuses it, so the caller can tell the agent instead of pretending it was delivered.
export async function sendReplyEmail(ticket: ReplyTicket, body: string) {
  const config = readMailConfig()
  if (!config) return false
  await transporterFor(config).sendMail(buildReplyEmail(ticket, body, config.from))
  return true
}
