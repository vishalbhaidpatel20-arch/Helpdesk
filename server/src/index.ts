import './instrument'
import { existsSync } from 'node:fs'
import path from 'node:path'
import * as Sentry from '@sentry/bun'
import express from 'express'
import app from './app'
import { startImapPoller } from './lib/imapPoller'
import { startQueue, stopQueue } from './lib/queue'
import { startSmtpServer } from './lib/smtpServer'

// Long-lived server for local development and for hosts that run a container or a VM. On Vercel the app in app.ts runs
// as a function instead (api/index.ts) and this file is not used.
const port = Number(process.env.PORT ?? 3000)

// With NODE_ENV=production one process serves both the API and the built client (client/dist), so the browser app and
// its session cookies share the API's origin. Unknown paths fall back to index.html for the client-side router.
const clientDist = path.resolve(import.meta.dir, '../../client/dist')
if (process.env.NODE_ENV === 'production' && existsSync(path.join(clientDist, 'index.html'))) {
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
