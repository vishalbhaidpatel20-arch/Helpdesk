import { Router } from 'express'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'

export const ticketsRouter = Router()

// Any signed-in user (agent or admin). Pagination arrives with the rest of ticket CRUD.
ticketsRouter.get('/', requireAuth, async (_req, res) => {
  const tickets = await prisma.ticket.findMany({
    select: {
      id: true,
      subject: true,
      senderName: true,
      senderEmail: true,
      status: true,
      category: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  res.json({ tickets })
})
