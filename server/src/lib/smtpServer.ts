import { simpleParser } from 'mailparser'
import { SMTPServer } from 'smtp-server'
import type { Readable } from 'node:stream'
import { handleIncomingEmail, InvalidEmailError } from './handleIncomingEmail'
import type { ParsedEmail } from './handleIncomingEmail'
import { toParsedEmail } from './toParsedEmail'

const DEFAULT_PORT = 2525
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024

type SmtpError = Error & { responseCode: number }

// smtp-server turns an error with a responseCode into that SMTP reply (4xx: sender retries later, 5xx: gives up)
function smtpError(message: string, responseCode: number) {
  return Object.assign(new Error(message), { responseCode }) as SmtpError
}

export function isAddressForDomain(address: string, domain: string) {
  return address.slice(address.lastIndexOf('@') + 1).toLowerCase() === domain.toLowerCase()
}

// Buffers the message but stops keeping data past the limit, so an oversized message cannot exhaust memory
async function readMessage(stream: Readable, maxBytes: number) {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of stream) {
    size += chunk.length
    if (size <= maxBytes) chunks.push(chunk)
  }
  return size > maxBytes ? null : Buffer.concat(chunks)
}

type SmtpServerOptions = {
  domain: string
  maxBytes?: number
  onEmail?: (email: ParsedEmail) => Promise<{ ticketId: number; created: boolean }>
}

export function createSmtpServer({ domain, maxBytes = DEFAULT_MAX_BYTES, onEmail = handleIncomingEmail }: SmtpServerOptions) {
  const server = new SMTPServer({
    // This receives mail from other servers (like an MX), so nobody signs in
    disabledCommands: ['AUTH'],
    authOptional: true,
    size: maxBytes,
    logger: false,
    onConnect(session, callback) {
      console.info(`[smtp] connection from ${session.remoteAddress}`)
      callback()
    },
    // Only accept mail for our own domain, which also keeps the server from being used as an open relay
    onRcptTo(address, session, callback) {
      if (!isAddressForDomain(address.address, domain)) {
        console.warn(`[smtp] rejected recipient ${address.address} from ${session.remoteAddress}`)
        return callback(smtpError(`Relay denied: we only accept mail for ${domain}`, 550))
      }
      callback()
    },
    onData(stream, session, callback) {
      void (async () => {
        const raw = await readMessage(stream, maxBytes)
        if (!raw) {
          console.warn(`[smtp] message from ${session.remoteAddress} exceeds ${maxBytes} bytes`)
          return callback(smtpError('Message too large', 552))
        }

        let email: ParsedEmail
        try {
          email = toParsedEmail(await simpleParser(raw))
        } catch (err) {
          console.error('[smtp] could not parse message', err)
          return callback(smtpError('Message could not be parsed', 550))
        }

        try {
          const { ticketId, created } = await onEmail(email)
          console.info(
            `[smtp] ${created ? 'created' : 'duplicate of'} ticket ${ticketId} from ${email.from[0]?.address} (${email.attachments.length} attachment(s) not stored)`,
          )
          callback(null, 'Message accepted')
        } catch (err) {
          if (err instanceof InvalidEmailError) {
            console.warn(`[smtp] rejected message: ${err.message}`)
            return callback(smtpError(err.message, 550))
          }
          // Temporary failure (e.g. database down): the sender retries, and a repeated Message-ID is not duplicated
          console.error('[smtp] could not handle message', err)
          callback(smtpError('Temporary failure, try again later', 451))
        }
      })()
    },
  })

  // Without a listener an 'error' event would crash the whole API process
  server.on('error', (err) => console.error('[smtp] server error', err))
  return server
}

// SMTP_DOMAIN turns the server on (nothing is accepted without knowing which domain is ours)
export function startSmtpServer() {
  const domain = process.env.SMTP_DOMAIN?.trim()
  if (!domain) {
    console.info('[smtp] disabled (set SMTP_DOMAIN to receive email over SMTP)')
    return undefined
  }

  const port = Number(process.env.SMTP_PORT ?? DEFAULT_PORT)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid SMTP_PORT: ${process.env.SMTP_PORT}`)
  const maxBytes = Number(process.env.SMTP_MAX_MESSAGE_BYTES ?? DEFAULT_MAX_BYTES)
  if (!Number.isInteger(maxBytes) || maxBytes < 1) throw new Error(`Invalid SMTP_MAX_MESSAGE_BYTES: ${process.env.SMTP_MAX_MESSAGE_BYTES}`)

  const server = createSmtpServer({ domain, maxBytes })
  const host = process.env.SMTP_HOST || '0.0.0.0'
  server.listen(port, host, () => console.info(`[smtp] listening on ${host}:${port} for @${domain}`))
  return server
}
