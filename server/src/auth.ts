import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { Role } from '../generated/enums'
import { prisma } from './db'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  trustedOrigins: ['http://localhost:5173'],
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: Role.AGENT, input: false },
    },
  },
})
