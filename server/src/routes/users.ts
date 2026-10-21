import { createUserSchema, updateUserSchema } from '@helpdesk/core'
import { Router } from 'express'
import { Role } from '../../generated/enums'
import { auth } from '../auth'
import { prisma } from '../db'
import { parseBody } from '../lib/parseBody'
import { requireAdmin, requireAuth } from '../middleware/auth'

export const usersRouter = Router()

// Admin only. Explicit select so password hashes and other account data are never returned.
usersRouter.get('/', requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  res.json({ users })
})

// Admin only. Sign-up is disabled, so create the user and credential account via the internal adapter.
usersRouter.post('/', requireAuth, requireAdmin, async (req, res) => {
  const body = parseBody(createUserSchema, req, res)
  if (!body) return
  const { name, email: normalizedEmail, password } = body

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

// Admin only. The password is changed only when one is provided.
usersRouter.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const body = parseBody(updateUserSchema, req, res)
  if (!body) return
  const { name, email, password } = body
  const id = String(req.params.id)

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing || existing.deletedAt) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  const taken = await prisma.user.findUnique({ where: { email } })
  if (taken && taken.id !== id) {
    res.status(409).json({ error: 'A user with this email already exists' })
    return
  }

  const ctx = await auth.$context
  const user = await ctx.internalAdapter.updateUser<{ role: Role }>(id, { name, email })
  if (password) {
    await ctx.internalAdapter.updatePassword(id, await ctx.password.hash(password))
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  })
})

// Admin only. Soft delete: the row is kept with deletedAt set, and the user's sessions are revoked.
usersRouter.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = String(req.params.id)

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing || existing.deletedAt) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  if (existing.role === Role.ADMIN) {
    res.status(403).json({ error: 'Admins cannot be deleted' })
    return
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { deletedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: id } }),
  ])
  res.status(204).end()
})
