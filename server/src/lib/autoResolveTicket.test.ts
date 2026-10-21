import { beforeEach, describe, expect, it, mock } from 'bun:test'

const generateText = mock(async (_options: { instructions: string; prompt: string }) => ({ text: '' }))
mock.module('ai', () => ({ generateText }))
mock.module('@ai-sdk/google', () => ({ google: (id: string) => ({ id }) }))

type UpdateArgs = { where: { id: number }; data: { status?: string; assignedToId?: null } }
const updateMany = mock(async (_args: UpdateArgs) => ({ count: 1 }))
const replyCreate = mock(async (_args: unknown) => ({}))
const aiAgentFindFirst = mock(async (_args: unknown): Promise<{ id: string } | null> => ({ id: 'ai-1' }))
const tx = { ticket: { updateMany }, reply: { create: replyCreate } }
mock.module('../db', () => ({ prisma: { ticket: { updateMany }, user: { findFirst: aiAgentFindFirst }, $transaction: async (fn: (t: typeof tx) => Promise<void>) => fn(tx) } }))
const loadKnowledgeBase = mock(async (): Promise<string | null> => 'KB')
mock.module('./knowledgeBase', () => ({ loadKnowledgeBase }))

const { autoResolveTicket } = await import('./autoResolveTicket')

const ticket = { subject: 'Forgot password', body: 'How?', senderName: 'Priya Sharma' }
const statuses = () => updateMany.mock.calls.map(([args]) => args.data.status)

describe('autoResolveTicket', () => {
  beforeEach(() => {
    for (const m of [generateText, updateMany, replyCreate, loadKnowledgeBase, aiAgentFindFirst]) m.mockReset()
    aiAgentFindFirst.mockResolvedValue({ id: 'ai-1' })
    updateMany.mockResolvedValue({ count: 1 })
    loadKnowledgeBase.mockResolvedValue('KB')
    generateText.mockResolvedValue({ text: JSON.stringify({ canResolve: true, confidence: 0.95, reply: 'Use Forgot Password.' }) })
  })

  it('resolves the ticket and saves the reply without an author', async () => {
    await autoResolveTicket(5, ticket)

    expect(statuses()).toEqual(['RESOLVED'])
    expect(updateMany.mock.calls[0]![0].data).toMatchObject({ resolvedAt: expect.any(Date) })
    expect(replyCreate).toHaveBeenCalledWith({
      data: { ticketId: 5, authorId: null, body: 'Hi Priya,\n\nUse Forgot Password.\n\nBest regards,\nSupport Team' },
    })
  })

  it('opens the ticket when the knowledge base cannot answer it', async () => {
    generateText.mockResolvedValue({ text: JSON.stringify({ canResolve: false, confidence: 0.9, reply: '' }) })
    await autoResolveTicket(5, ticket)

    expect(statuses()).toEqual(['OPEN'])
    expect(replyCreate).not.toHaveBeenCalled()
  })

  it('unassigns the AI agent from a ticket it could not resolve', async () => {
    loadKnowledgeBase.mockResolvedValue(null)
    await autoResolveTicket(5, ticket)

    expect(updateMany).toHaveBeenCalledWith({ where: { id: 5, assignedToId: 'ai-1' }, data: { assignedToId: null } })
  })

  it('keeps the AI agent assigned to a ticket it resolved', async () => {
    await autoResolveTicket(5, ticket)
    expect(updateMany.mock.calls.some(([args]) => args.data.assignedToId === null)).toBe(false)
  })

  it('does not touch the assignee when an agent already changed the status, or when there is no AI agent', async () => {
    loadKnowledgeBase.mockResolvedValue(null)
    updateMany.mockResolvedValueOnce({ count: 0 })
    await autoResolveTicket(5, ticket)
    expect(updateMany).toHaveBeenCalledTimes(1)

    updateMany.mockClear()
    aiAgentFindFirst.mockResolvedValue(null)
    await autoResolveTicket(5, ticket)
    expect(updateMany).toHaveBeenCalledTimes(1)
  })

  it('opens the ticket when the knowledge base file is missing, without calling the model', async () => {
    loadKnowledgeBase.mockResolvedValue(null)
    await autoResolveTicket(5, ticket)

    expect(generateText).not.toHaveBeenCalled()
    expect(statuses()).toEqual(['OPEN'])
  })

  it('adds no reply when an agent changed the ticket meanwhile', async () => {
    updateMany.mockResolvedValue({ count: 0 })
    await autoResolveTicket(5, ticket)
    expect(replyCreate).not.toHaveBeenCalled()
  })

  it('lets provider errors propagate', async () => {
    generateText.mockRejectedValue(new Error('boom'))
    await expect(autoResolveTicket(5, ticket)).rejects.toThrow('boom')
  })
})
