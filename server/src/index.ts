import './instrument'
import { existsSync } from 'node:fs'
import path from 'node:path'
import * as Sentry from '@sentry/bun'
import { toNodeHandler } from 'better-auth/node'
import cors from 'cors'
import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import helmet from 'helmet'
import { auth } from './auth'
import { startImapPoller } from './lib/imapPoller'
import { startQueue, stopQueue } from './lib/queue'
import { startSmtpServer } from './lib/smtpServer'
import { statsRouter } from './routes/stats'
import { ticketsRouter } from './routes/tickets'
import { usersRouter } from './routes/users'
import { webhooksRouter } from './routes/webhooks'

const app = express()
const port = Number(process.env.PORT ?? 3000)

const isProduction = process.env.NODE_ENV === 'production'
// Behind Railway's proxy: without this Express sees the proxy's address and http instead of the visitor's IP and https
if (isProduction) app.set('trust proxy', 1)

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

// In production one service serves both the API and the built client (client/dist), so the browser app and its
// session cookies share the API's origin. Unknown paths fall back to index.html for the client-side router.
const clientDist = path.resolve(import.meta.dir, '../../client/dist')
if (isProduction && existsSync(path.join(clientDist, 'index.html'))) {
  // Vite file names contain a content hash, so they can be cached for good; index.html must always be re-checked
  app.use('/assets', express.static(path.join(clientDist, 'assets'), { immutable: true, maxAge: '1y' }))
  app.use(express.static(clientDist, { index: false }))
  app.get('/{*splat}', (req, res, next) => {
    // A missing API route or asset must stay a 404, not turn into the app's HTML
    if (req.path.startsWith('/api/') || req.path.startsWith('/assets/')) return next()
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

// Terminal error handler: log details server-side, never leak stack traces to clients
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  // Report server faults to Sentry, but not mistakes by the caller (e.g. malformed JSON, which carries a 4xx status)
  const status = typeof err === 'object' && err !== null && 'status' in err ? Number(err.status) : 500
  if (!(status >= 400 && status < 500)) Sentry.captureException(err)
  res.status(500).json({ error: 'Internal server error' })
})

await startQueue()

const server = app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})

const smtpServer = startSmtpServer()
const imapPoller = startImapPoller()

// Let the running job finish before exiting
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    server.close()
    smtpServer?.close()
    imapPoller?.stop()
    // Send pending Sentry events before exiting
    void stopQueue()
      .finally(() => Sentry.close(2000))
      .finally(() => process.exit(0))
  })
}
