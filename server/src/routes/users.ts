import { createUserSchema } from '@helpdesk/core'
import { Router } from 'express'
import { Role } from '../../generated/enums'
import { auth } from '../auth'
import { prisma } from '../db'
import { requireAdmin, requireAuth } from '../middleware/auth'

export const usersRouter = Router()

// Admin only. Explicit select so password hashes and other account data are never returned.
usersRouter.get('/', requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  res.json({ users })
})

// Admin only. Sign-up is disabled, so create the user and credential account via the internal adapter.
usersRouter.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
    return
  }
  const { name, email: normalizedEmail, password } = parsed.data

  const ctx = await auth.$context

  if (await prisma.user.findUnique({ where: { email: normalizedEmail } })) {
    res.status(409).json({ error: 'A user with this email already exists' })
    return
  }

  const user = await ctx.internalAdapter.createUser<{ role: Role }>(
    {
      email: normalizedEmail,
      name,
      emailVerified: true,
      role: Role.AGENT,
    },
    { method: 'admin' },
  )
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: await ctx.password.hash(password),
  })

  res.status(201).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  })
})
