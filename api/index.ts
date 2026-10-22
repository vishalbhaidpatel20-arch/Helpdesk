// Vercel runs every file in api/ as a function. All /api/* requests are rewritten here (see vercel.json), and the
// Express app does its own routing.
// The app is imported from the bundle made by `bun run --cwd server build` (server/dist/app.js, one file with every
// dependency inlined), because Vercel's file tracing misses packages that are loaded dynamically (e.g.
// @better-auth/telemetry) and the workspace package @helpdesk/core.
// @ts-ignore the bundle is generated at build time and has no type declarations
import app from '../server/dist/app.js'

export default app
