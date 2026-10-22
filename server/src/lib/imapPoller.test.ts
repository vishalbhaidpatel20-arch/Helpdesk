import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { ParsedEmail } from './handleIncomingEmail'

// Fake mailbox: uid -> raw message. `seen` records the messages the poller marked as read.
const mailbox = { messages: new Map<number, { source: string; size: number }>(), seen: [] as number[] }

class FakeImapFlow {
  on() {}
  async connect() {}
  async getMailboxLock() {
    return { release() {} }
  }
  async search() {
    return [...mailbox.messages.keys()]
  }
  async fetchOne(uid: string, query: { size?: boolean; source?: boolean }) {
    const message = mailbox.messages.get(Number(uid))
    if (!message) return false
    return query.size ? { size: message.size } : { source: Buffer.from(message.source) }
  }
  async messageFlagsAdd(uid: string) {
    mailbox.seen.push(Number(uid))
  }
  async logout() {}
  close() {}
}
mock.module('imapflow', () => ({ ImapFlow: FakeImapFlow }))

const { InvalidEmailError } = await import('./handleIncomingEmail')
const { pollInbox, readImapConfig } = await import('./imapPoller')

const config = { host: 'imap.test', port: 993, user: 'me@test', pass: 'secret', pollSeconds: 60, maxAgeDays: 3 }
const raw = (from: string, body = 'Please help') =>
  `From: ${from}\r\nTo: me@test\r\nSubject: Hi\r\nMessage-ID: <${from}@x>\r\n\r\n${body}\r\n`

const handle = mock(async (_email: ParsedEmail) => ({ ticketId: 1, created: true }))

beforeEach(() => {
  mailbox.messages.clear()
  mailbox.seen = []
  handle.mockReset()
  handle.mockResolvedValue({ ticketId: 1, created: true })
})

describe('pollInbox', () => {
  it('turns unread messages into tickets and marks them read', async () => {
    const message = raw('Ada <ada@example.com>')
    mailbox.messages.set(5, { source: message, size: message.length })

    expect(await pollInbox(config, handle)).toBe(1)
    expect(handle.mock.calls[0]![0]).toMatchObject({ from: [{ name: 'Ada', address: 'ada@example.com' }], subject: 'Hi' })
    expect(mailbox.seen).toEqual([5])
  })

  it('marks a message that can never be a ticket as read', async () => {
    mailbox.messages.set(1, { source: raw('a@example.com'), size: 100 })
    handle.mockRejectedValue(new InvalidEmailError('Email has no sender'))

    expect(await pollInbox(config, handle)).toBe(0)
    expect(mailbox.seen).toEqual([1])
  })

  it('leaves a message unread after a temporary failure so the next poll retries it', async () => {
    mailbox.messages.set(1, { source: raw('a@example.com'), size: 100 })
    mailbox.messages.set(2, { source: raw('b@example.com'), size: 100 })
    handle.mockRejectedValueOnce(new Error('database is down'))

    expect(await pollInbox(config, handle)).toBe(1)
    expect(mailbox.seen).toEqual([2])
  })

  it('skips an oversized message without parsing it', async () => {
    mailbox.messages.set(1, { source: raw('a@example.com'), size: 50 * 1024 * 1024 })

    expect(await pollInbox(config, handle)).toBe(0)
    expect(handle).not.toHaveBeenCalled()
    expect(mailbox.seen).toEqual([1])
  })
})

describe('readImapConfig', () => {
  const saved = { ...process.env }
  afterEach(() => {
    process.env = { ...saved }
  })

  it('is off without IMAP_USER', () => {
    delete process.env.IMAP_USER
    expect(readImapConfig()).toBeUndefined()
  })

  it('defaults to Gmail and falls back to SMTP_PASSWORD without its spaces', () => {
    process.env.IMAP_USER = 'me@gmail.com'
    delete process.env.IMAP_PASSWORD
    process.env.SMTP_PASSWORD = 'abcd efgh ijkl mnop'

    expect(readImapConfig()).toMatchObject({ host: 'imap.gmail.com', port: 993, pass: 'abcdefghijklmnop', pollSeconds: 60 })
  })

  it('throws when there is no password', () => {
    process.env.IMAP_USER = 'me@gmail.com'
    delete process.env.IMAP_PASSWORD
    delete process.env.SMTP_PASSWORD

    expect(() => readImapConfig()).toThrow('IMAP_PASSWORD')
  })

  it('rejects an invalid poll interval', () => {
    process.env.IMAP_USER = 'me@gmail.com'
    process.env.SMTP_PASSWORD = 'x'
    process.env.IMAP_POLL_SECONDS = '0'

    expect(() => readImapConfig()).toThrow('IMAP_POLL_SECONDS')
  })
})
