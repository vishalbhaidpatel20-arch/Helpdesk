import { beforeEach, describe, expect, it, mock } from 'bun:test'

const generateText = mock(async (_options: { instructions: string; prompt: string }) => ({ text: '' }))
mock.module('ai', () => ({ generateText }))
mock.module('@ai-sdk/google', () => ({ google: (id: string) => ({ id }) }))

type UpdateArgs = { where: { id: number }; data: { status?: string; category?: string } }
const findUnique = mock(async (_args: unknown): Promise<unknown> => null)
const updateMany = mock(async (_args: UpdateArgs) => ({ count: 1 }))
const replyCreate = mock(async (_args: unknown) => ({}))
const tx = { ticket: { updateMany }, reply: { create: replyCreate } }
mock.module('../db', () => ({
  prisma: { ticket: { findUnique, updateMany }, $transaction: async (fn: (t: typeof tx) => Promise<void>) => fn(tx) },
}))
const loadKnowledgeBase = mock(async (): Promise<string | null> => 'KB')
mock.module('./knowledgeBase', () => ({ loadKnowledgeBase }))

const { processTicket } = await import('./processTicket')

const base = { subject: 'Forgot password', body: 'How?', senderName: 'Priya Sharma', category: null }
const resolvable = JSON.stringify({ canResolve: true, confidence: 0.95, reply: 'Use Forgot Password.' })
const unresolvable = JSON.stringify({ canResolve: false, confidence: 0.9, reply: '' })
// The model is asked for the category first, then for the answer
const answers = (...texts: string[]) => {
  for (const text of texts) generateText.mockResolvedValueOnce({ text })
}
const statusWrites = () => updateMany.mock.calls.map(([args]) => args.data.status).filter(Boolean)
const run = () => processTicket(5)

describe('processTicket', () => {
  beforeEach(() => {
    for (const m of [generateText, findUnique, updateMany, replyCreate, loadKnowledgeBase]) m.mockReset()
    updateMany.mockResolvedValue({ count: 1 })
    findUnique.mockResolvedValue({ ...base, status: 'NEW' })
    loadKnowledgeBase.mockResolvedValue('KB')
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key'
  })

  it('classifies, then resolves with the AI reply (no author)', async () => {
    answers('GENERAL_QUESTION', resolvable)
    await run()

    expect(statusWrites()).toEqual(['PROCESSING', 'RESOLVED'])
    expect(updateMany).toHaveBeenCalledWith({ where: { id: 5, category: null }, data: { category: 'GENERAL_QUESTION' } })
    expect(replyCreate).toHaveBeenCalledWith({
      data: { ticketId: 5, authorId: null, body: 'Hi Priya,\n\nUse Forgot Password.\n\nBest regards,\nSupport Team' },
    })
  })

  it('opens the ticket when the knowledge base cannot resolve it', async () => {
    answers('GENERAL_QUESTION', unresolvable)
    await run()

    expect(statusWrites()).toEqual(['PROCESSING', 'OPEN'])
    expect(replyCreate).not.toHaveBeenCalled()
  })

  it('opens the ticket when there is no knowledge base file', async () => {
    loadKnowledgeBase.mockResolvedValue(null)
    answers('GENERAL_QUESTION')
    await run()

    expect(statusWrites()).toEqual(['PROCESSING', 'OPEN'])
  })

  it('does not add a reply when an agent changed the ticket meanwhile', async () => {
    answers('GENERAL_QUESTION', resolvable)
    updateMany.mockImplementation(async (args) => ({ count: args.data.status === 'RESOLVED' ? 0 : 1 }))
    await run()

    expect(replyCreate).not.toHaveBeenCalled()
  })

  it('only classifies a ticket that is already past NEW', async () => {
    findUnique.mockResolvedValue({ ...base, status: 'OPEN' })
    answers('REFUND_REQUEST')
    await run()

    expect(statusWrites()).toEqual([])
    expect(updateMany).toHaveBeenCalledWith({ where: { id: 5, category: null }, data: { category: 'REFUND_REQUEST' } })
    expect(replyCreate).not.toHaveBeenCalled()
  })

  it('opens the ticket without an API key', async () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
    await run()

    expect(generateText).not.toHaveBeenCalled()
    expect(statusWrites()).toEqual(['OPEN'])
  })

  it('does nothing for a missing ticket', async () => {
    findUnique.mockResolvedValue(null)
    await run()
    expect(updateMany).not.toHaveBeenCalled()
  })

  it('opens the ticket right away when the model call fails, without throwing', async () => {
    generateText.mockRejectedValue(new Error('boom'))
    await run()

    expect(statusWrites()).toEqual(['PROCESSING', 'OPEN'])
    expect(replyCreate).not.toHaveBeenCalled()
  })

  it('opens the ticket when the model fails while answering from the knowledge base', async () => {
    generateText.mockResolvedValueOnce({ text: 'GENERAL_QUESTION' })
    generateText.mockRejectedValueOnce(new Error('boom'))
    await run()

    expect(statusWrites()).toEqual(['PROCESSING', 'OPEN'])
  })

  it('does not reopen a ticket an agent has already moved on', async () => {
    findUnique.mockResolvedValue({ ...base, status: 'CLOSED' })
    generateText.mockRejectedValue(new Error('boom'))
    await run()

    expect(statusWrites()).toEqual([])
  })
})
