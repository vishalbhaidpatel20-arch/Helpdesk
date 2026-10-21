import { beforeEach, describe, expect, it, mock } from 'bun:test'

const generateText = mock(async (_options: { instructions: string; prompt: string }) => ({ text: 'REFUND_REQUEST' }))
mock.module('ai', () => ({ generateText }))
mock.module('@ai-sdk/google', () => ({ google: (id: string) => ({ id }) }))

const { classifyTicket, parseCategory } = await import('./classifyTicket')

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
