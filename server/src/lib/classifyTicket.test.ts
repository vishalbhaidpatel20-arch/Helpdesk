import { beforeEach, describe, expect, it, mock } from 'bun:test'

const generateText = mock(async (_options: { instructions: string; prompt: string }) => ({ text: 'REFUND_REQUEST' }))
const findUnique = mock(async (_args: unknown): Promise<unknown> => null)
const updateMany = mock(async (_args: unknown) => ({ count: 1 }))
mock.module('ai', () => ({ generateText }))
mock.module('@ai-sdk/google', () => ({ google: (id: string) => ({ id }) }))
mock.module('../db', () => ({ prisma: { ticket: { findUnique, updateMany } } }))

const { classifyTicket, classifyTicketJob, parseCategory } = await import('./classifyTicket')

const ticket = { subject: 'Money back', body: 'Please refund me' }

describe('parseCategory', () => {
  it.each(['REFUND_REQUEST', '  refund_request\n', '"REFUND_REQUEST".'])('accepts %p', (text) => {
    expect(parseCategory(text)).toBe('REFUND_REQUEST')
  })

  it.each(['', 'SPAM', 'This is a REFUND_REQUEST maybe'])('rejects %p', (text) => {
    expect(parseCategory(text)).toBeNull()
  })
})

describe('classifyTicket', () => {
  beforeEach(() => {
    generateText.mockReset()
    generateText.mockResolvedValue({ text: 'TECHNICAL_QUESTION' })
  })

  it('sends the email as delimited data and returns the category', async () => {
    expect(await classifyTicket(ticket)).toBe('TECHNICAL_QUESTION')
    expect(generateText.mock.calls[0]![0].prompt).toContain('<customer_email>\nPlease refund me')
  })
})

describe('classifyTicketJob', () => {
  beforeEach(() => {
    generateText.mockReset()
    generateText.mockResolvedValue({ text: 'REFUND_REQUEST' })
    updateMany.mockClear()
    findUnique.mockReset()
    findUnique.mockResolvedValue({ ...ticket, category: null })
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key'
  })

  it('saves the category only on a ticket that is still unclassified', async () => {
    await classifyTicketJob(7)
    expect(updateMany).toHaveBeenCalledWith({ where: { id: 7, category: null }, data: { category: 'REFUND_REQUEST' } })
  })

  it('does nothing without an API key', async () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
    await classifyTicketJob(7)
    expect(generateText).not.toHaveBeenCalled()
  })

  it.each([null, { ...ticket, category: 'GENERAL_QUESTION' }])('skips a missing or already classified ticket (%p)', async (found) => {
    findUnique.mockResolvedValue(found)
    await classifyTicketJob(7)
    expect(generateText).not.toHaveBeenCalled()
  })

  it('leaves the ticket alone when the answer is not a category', async () => {
    generateText.mockResolvedValue({ text: 'no idea' })
    await classifyTicketJob(7)
    expect(updateMany).not.toHaveBeenCalled()
  })

  it('propagates provider errors so the job is retried', async () => {
    generateText.mockRejectedValue(new Error('boom'))
    await expect(classifyTicketJob(7)).rejects.toThrow('boom')
    expect(updateMany).not.toHaveBeenCalled()
  })
})
