import { Router } from 'express'
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
