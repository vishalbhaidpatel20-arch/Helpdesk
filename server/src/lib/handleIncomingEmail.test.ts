import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { ParsedEmail } from './handleIncomingEmail'

const createTicketFromEmail = mock(async (_email: unknown) => ({ ticket: { id: 7 }, created: true }))
mock.module('./createTicketFromEmail', () => ({ createTicketFromEmail }))

const { handleIncomingEmail, InvalidEmailError } = await import('./handleIncomingEmail')

const email: ParsedEmail = {
  from: [{ name: 'Ada Lovelace', address: 'Ada@Example.com' }],
  to: [{ name: '', address: 'support@helpdesk.test' }],
  cc: [],
  subject: 'Cannot log in',
  messageId: '<abc@example.com>',
  text: 'Help please',
  attachments: [],
}

describe('handleIncomingEmail', () => {
  beforeEach(() => {
    createTicketFromEmail.mockClear()
  })

  it('creates a ticket from the sender, subject and text', async () => {
    expect(await handleIncomingEmail(email)).toEqual({ ticketId: 7, created: true })
    expect(createTicketFromEmail.mock.calls[0]![0]).toEqual({
      senderEmail: 'ada@example.com',
      senderName: 'Ada Lovelace',
      subject: 'Cannot log in',
      text: 'Help please',
      messageId: '<abc@example.com>',
    })
  })

  it('uses the address as the name and fills in a missing subject and body', async () => {
    await handleIncomingEmail({ ...email, from: [{ name: '', address: 'ada@example.com' }], subject: undefined, text: undefined })
    expect(createTicketFromEmail.mock.calls[0]![0]).toMatchObject({
      senderName: 'ada@example.com',
      subject: '(no subject)',
      text: '(no text content)',
    })
  })

  it('cuts values longer than the schema allows instead of rejecting the email', async () => {
    await handleIncomingEmail({ ...email, subject: 's'.repeat(400), text: 't'.repeat(60_000) })
    const saved = createTicketFromEmail.mock.calls[0]![0] as { subject: string; text: string }
    expect(saved.subject).toHaveLength(255)
    expect(saved.text).toHaveLength(50_000)
  })

  it('rejects an email without a sender', async () => {
    await expect(handleIncomingEmail({ ...email, from: [] })).rejects.toBeInstanceOf(InvalidEmailError)
    expect(createTicketFromEmail).not.toHaveBeenCalled()
  })

  it('rejects an invalid sender address', async () => {
    await expect(handleIncomingEmail({ ...email, from: [{ name: 'X', address: 'not-an-email' }] })).rejects.toBeInstanceOf(InvalidEmailError)
  })
})
