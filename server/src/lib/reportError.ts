import * as Sentry from '@sentry/bun'

// For errors the server handles itself (a failed poll, a ticket that could not be processed): log them like before
// and also send them to Sentry, which is a no-op when SENTRY_DSN is not set. `context` says what was being done.
export function reportError(context: string, err: unknown) {
  console.error(context, err)
  Sentry.captureException(err, { extra: { context } })
}
