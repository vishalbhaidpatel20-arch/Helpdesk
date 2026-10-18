import { toNodeHandler } from 'better-auth/node'
import cors from 'cors'
import express from 'express'
import { auth } from './auth'

const app = express()
const port = Number(process.env.PORT ?? 3000)

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
// Must be mounted before express.json(), which would consume the request body
app.all('/api/auth/*splat', toNodeHandler(auth))

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})
