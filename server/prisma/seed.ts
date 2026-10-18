import 'dotenv/config'
import { auth } from '../src/auth'
import { Role } from '../generated/enums'
import { prisma } from '../src/db'

const email = process.env.SEED_ADMIN_EMAIL
const password = process.env.SEED_ADMIN_PASSWORD

if (!email || !password) {
  throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set')
}

const ctx = await auth.$context

const existing = await prisma.user.findUnique({ where: { email } })

if (existing) {
  console.log(`Admin ${email} already exists, skipping`)
} else {
  // Go through the internal adapter since public sign-up is disabled
  const user = await ctx.internalAdapter.createUser({
    email,
    name: 'Admin',
    emailVerified: true,
    role: Role.ADMIN,
  })
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: await ctx.password.hash(password),
  })
  console.log(`Created admin ${email}`)
}

await prisma.$disconnect()
