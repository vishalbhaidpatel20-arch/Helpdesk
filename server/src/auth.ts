import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { Role } from '../generated/enums'
import { prisma } from './db'

const clientUrl = process.env.CLIENT_URL
if (!clientUrl) {
  throw new Error('CLIENT_URL must be set (the origin the client is served from)')
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  // Production only: dev and e2e runs sign in repeatedly and would trip the sign-in limit (3 per 10s)
  rateLimit: { enabled: process.env.NODE_ENV === 'production' },
  advanced: { useSecureCookies: process.env.NODE_ENV === 'production' },
  trustedOrigins: [clientUrl],
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: Role.AGENT, input: false },
    },
  },
})
