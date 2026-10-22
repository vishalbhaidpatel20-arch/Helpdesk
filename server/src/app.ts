import './instrument'
import * as Sentry from '@sentry/bun'
import { toNodeHandler } from 'better-auth/node'
import cors from 'cors'
import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import helmet from 'helmet'
import { auth } from './auth'
import { cronRouter } from './routes/cron'
import { statsRouter } from './routes/stats'
import { ticketsRouter } from './routes/tickets'
import { usersRouter } from './routes/users'
import { webhooksRouter } from './routes/webhooks'

// The Express app without anything that listens or runs in the background, so Vercel can run it as a function
// (api/index.ts) and index.ts can run it as a long-lived server.
const app = express()

const isVercel = Boolean(process.env.VERCEL)

// Behind a proxy (Vercel, or any host in front of a container): without this Express sees the proxy's address and
// http instead of the visitor's IP and https
if (process.env.NODE_ENV === 'production' || isVercel) app.set('trust proxy', 1)

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        // The browser app reports its errors straight to Sentry
        'connect-src': ["'self'", 'https://*.ingest.sentry.io', 'https://*.ingest.us.sentry.io', 'https://*.ingest.de.sentry.io'],
      },
    },
  }),
)
// CLIENT_URL is guaranteed set: importing ./auth throws without it
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
// Must be mounted before express.json(), which would consume the request body
app.all('/api/auth/*splat', toNodeHandler(auth))

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/users', usersRouter)
app.use('/api/tickets', ticketsRouter)
app.use('/api/stats', statsRouter)
app.use('/api/webhooks', webhooksRouter)
app.use('/api/cron', cronRouter)

// Terminal error handler: log details server-side, never leak stack traces to clients
app.use(async (err: unknown, _req: Request, res: Response, next: NextFunction) => {
  console.error(err)
  // Report server faults to Sentry, but not mistakes by the caller (e.g. malformed JSON, which carries a 4xx status)
  const status = typeof err === 'object' && err !== null && 'status' in err ? Number(err.status) : 500
  const isClientError = status >= 400 && status < 500
  if (!isClientError) {
    Sentry.captureException(err)
    // A serverless function can be frozen right after responding, so send the event before that
    if (isVercel) await Sentry.flush(2000)
  }
  // A response that has already started can't get a new status; let Express close the connection
  if (res.headersSent) return next(err)
  // Caller mistakes (malformed JSON, body too large) keep their 4xx status instead of looking like a server fault
  if (isClientError) {
    res.status(status).json({ error: status === 413 ? 'Request body is too large' : 'Invalid request' })
    return
  }
  res.status(500).json({ error: 'Internal server error' })
})

export default app
