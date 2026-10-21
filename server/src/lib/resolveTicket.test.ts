import { beforeEach, describe, expect, it, mock } from 'bun:test'

const generateText = mock(async (_options: { instructions: string; prompt: string }) => ({ text: '' }))
mock.module('ai', () => ({ generateText }))
mock.module('@ai-sdk/google', () => ({ google: (id: string) => ({ id }) }))

const { resolveTicket, parseAnswer, MIN_CONFIDENCE } = await import('./resolveTicket')

const ticket = { subject: 'Forgot password', body: 'How do I reset it?', senderName: 'Priya Sharma' }
const answer = (fields: object) => JSON.stringify({ canResolve: true, confidence: 0.95, reply: 'Click Forgot Password.', ...fields })

describe('parseAnswer', () => {
  it('reads JSON, also when wrapped in a markdown fence', () => {
    expect(parseAnswer('```json\n' + answer({}) + '\n```')?.reply).toBe('Click Forgot Password.')
  })

  it.each(['', 'sorry', '{"canResolve": "yes"}', '{not json}'])('rejects %p', (text) => {
    expect(parseAnswer(text)).toBeNull()
  })
})

describe('resolveTicket', () => {
  beforeEach(() => {
    generateText.mockReset()
    generateText.mockResolvedValue({ text: answer({}) })
  })

  it('returns the reply with a greeting and sign-off', async () => {
    expect(await resolveTicket(ticket, 'KB TEXT')).toBe('Hi Priya,\n\nClick Forgot Password.\n\nBest regards,\nSupport Team')
  })

  it('sends the knowledge base and the email as delimited data', async () => {
    await resolveTicket(ticket, 'KB TEXT')
    const { prompt } = generateText.mock.calls[0]![0]
    expect(prompt).toContain('<knowledge_base>\nKB TEXT\n</knowledge_base>')
    expect(prompt).toContain('<customer_email>\nHow do I reset it?\n</customer_email>')
  })

  it.each([
    ['the model says it cannot resolve', answer({ canResolve: false })],
    ['the confidence is low', answer({ confidence: MIN_CONFIDENCE - 0.01 })],
    ['the reply is empty', answer({ reply: '  ' })],
    ['the output is not JSON', 'I cannot help'],
  ])('returns null when %s', async (_name, text) => {
    generateText.mockResolvedValue({ text })
    expect(await resolveTicket(ticket, 'KB')).toBeNull()
  })

  it('propagates provider errors', async () => {
    generateText.mockRejectedValue(new Error('boom'))
    await expect(resolveTicket(ticket, 'KB')).rejects.toThrow('boom')
  })
})
