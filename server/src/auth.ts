import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@helpdesk/core'
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
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
  },
  // Production only: dev and e2e runs sign in repeatedly and would trip the sign-in limit (3 per 10s)
  rateLimit: { enabled: process.env.NODE_ENV === 'production' },
  advanced: { useSecureCookies: process.env.NODE_ENV === 'production' },
  // On Vercel preview deployments the site is served from the deployment's own URLs (e.g.
  // helpdesk-git-<branch>.vercel.app), not CLIENT_URL; without them Better Auth rejects sign-in there as
  // "Invalid origin". Vercel sets these system variables itself, so production and local runs are unchanged.
  trustedOrigins: [
    clientUrl,
    ...[process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
      .filter((host): host is string => Boolean(host))
      .map((host) => `https://${host}`),
  ],
  databaseHooks: {
    session: {
      create: {
        // Soft-deleted users cannot sign in: returning false aborts creating the session
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { deletedAt: true },
          })
          if (user?.deletedAt) return false
        },
      },
    },
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: Role.AGENT, input: false },
    },
  },
})
