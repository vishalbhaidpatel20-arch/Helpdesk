import { toNodeHandler } from 'better-auth/node'
import cors from 'cors'
import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import helmet from 'helmet'
import { auth } from './auth'
import { startQueue, stopQueue } from './lib/queue'
import { ticketsRouter } from './routes/tickets'
import { usersRouter } from './routes/users'
import { webhooksRouter } from './routes/webhooks'

const app = express()
const port = Number(process.env.PORT ?? 3000)

app.use(helmet())
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
app.use('/api/webhooks', webhooksRouter)

// Terminal error handler: log details server-side, never leak stack traces to clients
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

await startQueue()

const server = app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})

// Let the running job finish before exiting
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    server.close()
    void stopQueue().finally(() => process.exit(0))
  })
}
