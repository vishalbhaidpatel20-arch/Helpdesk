import * as Sentry from '@sentry/bun'
import { scrubEvent } from './lib/scrubEvent'

// Imported first in index.ts so Sentry can see everything that loads after it. Without SENTRY_DSN the SDK stays off
// and every Sentry call is a no-op, so local development and tests send nothing.
Sentry.init({
  dsn: process.env.SENTRY_DSN?.trim() || undefined,
  environment: process.env.SENTRY_ENVIRONMENT?.trim() || process.env.NODE_ENV || 'development',
  // Errors only: no performance tracing
  tracesSampleRate: 0,
  // Tickets and emails hold customers' personal data and the requests carry session cookies and the webhook secret.
  // The SDK collects all of that by default, so switch it off; scrubEvent below is a second layer.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
    queues: false,
    stackFrameVariables: false,
    genAI: { inputs: false, outputs: false },
  },
  beforeSend: scrubEvent,
})
