import type { ErrorEvent } from '@sentry/bun'

// Tickets and emails hold customers' personal data, so nothing from the request (body, cookies, query string,
// headers) is sent to Sentry: an event only carries the error, its stack trace and the request's method and path
export function scrubEvent<T extends ErrorEvent>(event: T): T {
  if (event.request) {
    const { method, url } = event.request
    event.request = { method, url: url?.split('?')[0] }
  }
  delete event.user
  return event
}
