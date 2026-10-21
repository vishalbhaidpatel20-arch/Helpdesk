import { beforeEach, describe, expect, it, mock } from 'bun:test'

type Call = { model: { id: string }; instructions: string; prompt: string }
const generateText = mock(async (_options: Call) => ({ text: '  ok  ' }))
mock.module('ai', () => ({ generateText }))
mock.module('@ai-sdk/google', () => ({ google: (id: string) => ({ id }) }))

const { generateWithFallback, MODELS } = await import('./generateWithFallback')

const options = { instructions: 'be brief', prompt: 'hello' }
const overloaded = { lastError: { statusCode: 503, message: 'high demand' } }
const used = () => generateText.mock.calls.map((call) => call[0].model.id)

describe('generateWithFallback', () => {
  beforeEach(() => {
    generateText.mockReset()
    generateText.mockResolvedValue({ text: '  ok  ' })
  })

  it('uses the first model and returns the trimmed text', async () => {
    expect(await generateWithFallback(options)).toBe('ok')
    expect(used()).toEqual([MODELS[0]])
  })

  it('moves to the next model when one is overloaded (503) or rate limited (429)', async () => {
    generateText.mockRejectedValueOnce(overloaded)
    generateText.mockRejectedValueOnce({ statusCode: 429, message: 'quota' })

    expect(await generateWithFallback(options)).toBe('ok')
    expect(used()).toEqual([MODELS[0], MODELS[1], MODELS[2]])
  })

  it('passes the instructions and prompt to every attempt', async () => {
    generateText.mockRejectedValueOnce(overloaded)

    await generateWithFallback(options)

    for (const [call] of generateText.mock.calls) {
      expect(call.instructions).toBe('be brief')
      expect(call.prompt).toBe('hello')
    }
  })

  it('throws the last error when every model is overloaded', async () => {
    generateText.mockRejectedValue(overloaded)

    await expect(generateWithFallback(options)).rejects.toBe(overloaded)
    expect(used()).toEqual(MODELS)
  })

  it.each([401, 404, 500])('does not fall back on a %i error', async (statusCode) => {
    const err = { statusCode, message: 'nope' }
    generateText.mockRejectedValue(err)

    await expect(generateWithFallback(options)).rejects.toBe(err)
    expect(used()).toEqual([MODELS[0]])
  })
})
