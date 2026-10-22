import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import { connect } from 'node:net'
import type { AddressInfo } from 'node:net'
import { InvalidEmailError } from './handleIncomingEmail'
import type { ParsedEmail } from './handleIncomingEmail'
import { createSmtpServer, isAddressForDomain } from './smtpServer'

const onEmail = mock(async (_email: ParsedEmail) => ({ ticketId: 1, created: true }))
const server = createSmtpServer({ domain: 'helpdesk.test', maxBytes: 2000, onEmail })
let port = 0

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
  port = (server.server.address() as AddressInfo).port
})
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))
beforeEach(() => {
  onEmail.mockReset()
  onEmail.mockResolvedValue({ ticketId: 1, created: true })
})

// Plays an SMTP conversation: waits for each reply (a line like "250 ...") before sending the next line
async function converse(lines: string[]) {
  const socket = connect(port, '127.0.0.1')
  socket.setEncoding('utf8')
  let buffer = ''
  const replies: string[] = []
  let waiting: (() => void) | undefined
  socket.on('data', (chunk: string) => {
    buffer += chunk
    for (let end = buffer.search(/^\d{3} .*\r\n/m); end !== -1; end = buffer.search(/^\d{3} .*\r\n/m)) {
      const lineEnd = buffer.indexOf('\r\n', end) + 2
      replies.push(buffer.slice(end, lineEnd).trim())
      buffer = buffer.slice(lineEnd)
      waiting?.()
    }
  })
  const nextReply = () => new Promise<void>((resolve) => (waiting = resolve))

  await nextReply() // greeting
  for (const line of lines) {
    socket.write(`${line}\r\n`)
    await nextReply()
  }
  socket.end()
  return replies
}

const message = (body: string) =>
  ['From: Ada <ada@example.com>', 'To: support@helpdesk.test', 'Subject: Hi', 'Message-ID: <m1@example.com>', '', body, '.'].join('\r\n')

const send = (body: string, rcpt = 'support@helpdesk.test') => [
  'EHLO client.test',
  'MAIL FROM:<ada@example.com>',
  `RCPT TO:<${rcpt}>`,
  'DATA',
  message(body),
]

describe('isAddressForDomain', () => {
  it.each([['support@helpdesk.test'], ['Support@HelpDesk.TEST']])('accepts %p', (address) => {
    expect(isAddressForDomain(address, 'helpdesk.test')).toBe(true)
  })

  it.each([['support@other.test'], ['support@sub.helpdesk.test'], ['support@helpdesk.test.evil.com']])('rejects %p', (address) => {
    expect(isAddressForDomain(address, 'helpdesk.test')).toBe(false)
  })
})

describe('SMTP server', () => {
  it('parses an accepted message and passes it to the handler', async () => {
    const replies = await converse(send('Please help'))

    expect(replies.at(-1)).toStartWith('250')
    const email = onEmail.mock.calls[0]![0]
    expect(email).toMatchObject({
      from: [{ name: 'Ada', address: 'ada@example.com' }],
      to: [{ address: 'support@helpdesk.test' }],
      cc: [],
      subject: 'Hi',
      messageId: '<m1@example.com>',
      attachments: [],
    })
    expect(email.text?.trim()).toBe('Please help')
  })

  it('refuses recipients outside the domain and never calls the handler', async () => {
    const replies = await converse(['EHLO client.test', 'MAIL FROM:<ada@example.com>', 'RCPT TO:<someone@other.test>'])

    expect(replies.at(-1)).toStartWith('550')
    expect(onEmail).not.toHaveBeenCalled()
  })

  it('rejects a message over the size limit', async () => {
    const replies = await converse(send('x'.repeat(5000)))

    expect(replies.at(-1)).toStartWith('552')
    expect(onEmail).not.toHaveBeenCalled()
  })

  it('answers 550 when the email can never become a ticket', async () => {
    onEmail.mockRejectedValue(new InvalidEmailError('Email has no sender'))
    expect((await converse(send('hello'))).at(-1)).toStartWith('550')
  })

  it('answers 451 on a temporary failure so the sender retries', async () => {
    onEmail.mockRejectedValue(new Error('database is down'))
    expect((await converse(send('hello'))).at(-1)).toStartWith('451')
  })
})
