import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { handleIncomingEmail, InvalidEmailError } from './handleIncomingEmail'
import type { ParsedEmail } from './handleIncomingEmail'
import { toParsedEmail } from './toParsedEmail'

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_MESSAGE_BYTES = 10 * 1024 * 1024

export type ImapConfig = {
  host: string
  port: number
  user: string
  pass: string
  pollSeconds: number
  maxAgeDays: number
}

type HandleEmail = (email: ParsedEmail) => Promise<{ ticketId: number; created: boolean }>

function positiveInt(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback)
  if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${name}: ${process.env[name]}`)
  return value
}

// IMAP_USER turns polling on. The password defaults to SMTP_PASSWORD (a Gmail app password works for both)
export function readImapConfig(): ImapConfig | undefined {
  const user = process.env.IMAP_USER?.trim()
  if (!user) return undefined
  // App passwords are shown in groups ("abcd efgh ..."), but the spaces are not part of the password
  const pass = (process.env.IMAP_PASSWORD ?? process.env.SMTP_PASSWORD ?? '').replace(/\s+/g, '')
  if (!pass) throw new Error('IMAP_USER is set but neither IMAP_PASSWORD nor SMTP_PASSWORD is')
  return {
    host: process.env.IMAP_HOST?.trim() || 'imap.gmail.com',
    port: positiveInt('IMAP_PORT', 993),
    user,
    pass,
    pollSeconds: positiveInt('IMAP_POLL_SECONDS', 60),
    maxAgeDays: positiveInt('IMAP_MAX_AGE_DAYS', 3),
  }
}

// One pass over the inbox: turns every unread message of the last few days into a ticket, then marks it read.
// A message is left unread when handling it fails temporarily, so the next pass retries it (a repeated Message-ID
// never creates a duplicate ticket).
export async function pollInbox(config: ImapConfig, handle: HandleEmail = handleIncomingEmail) {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true,
    auth: { user: config.user, pass: config.pass },
    logger: false,
  })
  // Without a listener an 'error' event would crash the whole API process
  client.on('error', (err) => console.error('[imap] connection error', err))

  await client.connect()
  try {
    const lock = await client.getMailboxLock('INBOX')
    try {
      const since = new Date(Date.now() - config.maxAgeDays * DAY_MS)
      const uids = (await client.search({ seen: false, since }, { uid: true })) || []
      let processed = 0

      for (const uid of uids) {
        const markRead = () => client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true })

        const info = await client.fetchOne(String(uid), { size: true }, { uid: true })
        if (!info) continue
        if (info.size && info.size > MAX_MESSAGE_BYTES) {
          console.warn(`[imap] skipped message ${uid}: ${info.size} bytes exceeds ${MAX_MESSAGE_BYTES}`)
          await markRead()
          continue
        }

        const message = await client.fetchOne(String(uid), { source: true }, { uid: true })
        if (!message || !message.source) continue

        let email: ParsedEmail
        try {
          email = toParsedEmail(await simpleParser(message.source))
        } catch (err) {
          console.error(`[imap] could not parse message ${uid}`, err)
          await markRead()
          continue
        }

        try {
          const { ticketId, created } = await handle(email)
          console.info(`[imap] ${created ? 'created' : 'duplicate of'} ticket ${ticketId} from ${email.from[0]?.address}`)
          await markRead()
          processed++
        } catch (err) {
          if (err instanceof InvalidEmailError) {
            console.warn(`[imap] rejected message ${uid}: ${err.message}`)
            await markRead()
          } else {
            console.error(`[imap] could not handle message ${uid}, will retry`, err)
          }
        }
      }
      return processed
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => client.close())
  }
}

// Polls one after another (never two at once) and keeps going after a failed pass, so a network blip or a
// wrong password is logged instead of taking the API down.
export function startImapPoller() {
  const config = readImapConfig()
  if (!config) {
    console.info('[imap] disabled (set IMAP_USER to receive email by polling a mailbox)')
    return undefined
  }

  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const run = async () => {
    try {
      await pollInbox(config)
    } catch (err) {
      console.error(`[imap] poll of ${config.host} failed`, err)
    }
    if (!stopped) timer = setTimeout(run, config.pollSeconds * 1000)
  }

  console.info(`[imap] polling ${config.user} on ${config.host} every ${config.pollSeconds}s`)
  void run()

  return {
    stop() {
      stopped = true
      clearTimeout(timer)
    },
  }
}
