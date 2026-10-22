import { describe, expect, it } from 'bun:test'
import type { ErrorEvent } from '@sentry/bun'
import { scrubEvent } from './scrubEvent'

describe('scrubEvent', () => {
  it('keeps only the method and path of the request', () => {
    const event: ErrorEvent = {
      type: undefined,
      message: 'boom',
      request: {
        method: 'POST',
        url: 'http://localhost:3000/api/webhooks/inbound-email?token=secret',
        data: { senderEmail: 'ada@example.com', text: 'my card number is ...' },
        cookies: { session: 'abc' },
        headers: { 'x-webhook-secret': 'shh' },
        query_string: 'token=secret',
      },
    }

    expect(scrubEvent(event).request as unknown).toEqual({ method: 'POST', url: 'http://localhost:3000/api/webhooks/inbound-email' })
  })

  it('removes the user and leaves an event without a request alone', () => {
    const event: ErrorEvent = { type: undefined, message: 'boom', user: { email: 'ada@example.com', ip_address: '1.2.3.4' } }

    const scrubbed = scrubEvent(event)
    expect(scrubbed.user).toBeUndefined()
    expect(scrubbed.request).toBeUndefined()
    expect(scrubbed.message).toBe('boom')
  })
})
