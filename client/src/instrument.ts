import * as Sentry from '@sentry/react'

// Imported first in main.tsx. Without VITE_SENTRY_DSN the SDK stays off and every Sentry call is a no-op.
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || undefined,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
  // Errors only: no tracing and no session replay
  tracesSampleRate: 0,
  // Ticket pages show customers' emails, so keep user details, cookies and request data out of the events
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
  },
})
