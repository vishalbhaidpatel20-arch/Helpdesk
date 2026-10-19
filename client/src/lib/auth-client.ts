import { inferAdditionalFields } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

// No baseURL: requests go to the current origin, which Vite proxies to the server at /api
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields({ user: { role: { type: 'string' } } })],
})
