// Vercel runs every file in api/ as a function. All /api/* requests are rewritten here (see vercel.json), and the
// Express app (server/src/app.ts) does its own routing.
import app from '../server/src/app'

export default app
