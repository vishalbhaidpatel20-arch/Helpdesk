import { describe, expect, it } from 'bun:test'
import { aiErrorMessage } from './aiError'

const fallback = 'unavailable'

describe('aiErrorMessage', () => {
  it('shows the provider message for an overload (503), unwrapping the retry error', () => {
    const err = { lastError: { statusCode: 503, message: 'This model is currently experiencing high demand.' } }

    expect(aiErrorMessage(err, fallback)).toBe('This model is currently experiencing high demand.')
  })

  it('shows the provider message for a rate limit (429) that is not wrapped', () => {
    expect(aiErrorMessage({ statusCode: 429, message: 'Too many requests' }, fallback)).toBe('Too many requests')
  })

  it.each([401, 403, 400, 500])('keeps the fallback for status %i so provider details stay private', (statusCode) => {
    expect(aiErrorMessage({ lastError: { statusCode, message: 'secret detail' } }, fallback)).toBe(fallback)
  })

  it.each([new Error('boom'), null, undefined, 'text'])('keeps the fallback for non-provider errors', (err) => {
    expect(aiErrorMessage(err, fallback)).toBe(fallback)
  })
})
