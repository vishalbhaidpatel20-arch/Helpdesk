import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'

const sendMail = mock(async (_message: unknown) => ({}))
const createTransport = mock((_options: unknown) => ({ sendMail }))
mock.module('nodemailer', () => ({ createTransport }))

const { buildReplyEmail, readMailConfig, sendReplyEmail } = await import('./sendEmail')

const ticket = { subject: 'Cannot log in', senderName: 'Ada Lovelace', senderEmail: 'ada@example.com', messageId: '<abc@example.com>' }
const saved = { ...process.env }

beforeEach(() => {
  for (const key of ['MAIL_USER', 'MAIL_PASSWORD', 'MAIL_HOST', 'MAIL_PORT', 'MAIL_FROM', 'IMAP_USER', 'SMTP_PASSWORD']) delete process.env[key]
  sendMail.mockReset()
  sendMail.mockResolvedValue({})
  createTransport.mockClear()
})
afterEach(() => {
  process.env = { ...saved }
})

describe('readMailConfig', () => {
  it('is off without a mailbox', () => {
    expect(readMailConfig()).toBeUndefined()
  })

  it('uses IMAP_USER and SMTP_PASSWORD (spaces removed) with Gmail defaults', () => {
    process.env.IMAP_USER = 'help@gmail.com'
    process.env.SMTP_PASSWORD = 'abcd efgh ijkl mnop'

    expect(readMailConfig()).toEqual({ host: 'smtp.gmail.com', port: 465, user: 'help@gmail.com', pass: 'abcdefghijklmnop', from: 'help@gmail.com' })
  })

  it('lets MAIL_ settings override the defaults', () => {
    Object.assign(process.env, { IMAP_USER: 'a@gmail.com', MAIL_USER: 'b@corp.test', MAIL_PASSWORD: 'pw', MAIL_HOST: 'smtp.corp.test', MAIL_PORT: '587', MAIL_FROM: 'Helpdesk <b@corp.test>' })

    expect(readMailConfig()).toEqual({ host: 'smtp.corp.test', port: 587, user: 'b@corp.test', pass: 'pw', from: 'Helpdesk <b@corp.test>' })
  })

  it('throws without a password or with an invalid port', () => {
    process.env.MAIL_USER = 'a@gmail.com'
    expect(() => readMailConfig()).toThrow('SMTP_PASSWORD')

    process.env.SMTP_PASSWORD = 'pw'
    process.env.MAIL_PORT = 'abc'
    expect(() => readMailConfig()).toThrow('MAIL_PORT')
  })
})

describe('buildReplyEmail', () => {
  it('addresses the customer and threads onto their email', () => {
    expect(buildReplyEmail(ticket, 'Try resetting it', 'help@gmail.com')).toEqual({
      from: 'help@gmail.com',
      to: { name: 'Ada Lovelace', address: 'ada@example.com' },
      subject: 'Re: Cannot log in',
      text: 'Try resetting it',
      inReplyTo: '<abc@example.com>',
      references: '<abc@example.com>',
    })
  })

  it('does not stack "Re:" and wraps a bare Message-ID in angle brackets', () => {
    const message = buildReplyEmail({ ...ticket, subject: 'RE: Cannot log in', messageId: 'abc@example.com' }, 'x', 'h@g.com')
    expect(message.subject).toBe('RE: Cannot log in')
    expect(message.inReplyTo).toBe('<abc@example.com>')
  })

  it('leaves out the threading headers when the ticket has no Message-ID', () => {
    const message = buildReplyEmail({ ...ticket, messageId: null }, 'x', 'h@g.com')
    expect(message).not.toHaveProperty('inReplyTo')
  })
})

describe('sendReplyEmail', () => {
  it('sends nothing when sending is not configured', async () => {
    expect(await sendReplyEmail(ticket, 'Hello')).toBe(false)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('sends through the mail server over TLS on port 465', async () => {
    process.env.IMAP_USER = 'help@gmail.com'
    process.env.SMTP_PASSWORD = 'pw'

    expect(await sendReplyEmail(ticket, 'Hello')).toBe(true)
    expect(createTransport.mock.calls[0]![0]).toMatchObject({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: 'help@gmail.com', pass: 'pw' } })
    expect(sendMail.mock.calls[0]![0]).toMatchObject({ subject: 'Re: Cannot log in', text: 'Hello' })
  })

  it('lets a refusal from the mail server reach the caller', async () => {
    process.env.IMAP_USER = 'help@gmail.com'
    process.env.SMTP_PASSWORD = 'pw'
    sendMail.mockRejectedValue(new Error('Invalid login'))

    await expect(sendReplyEmail(ticket, 'Hello')).rejects.toThrow('Invalid login')
  })
})
