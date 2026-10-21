import { ticketListQuerySchema } from '@helpdesk/core'
import { Router } from 'express'
import { prisma } from '../db'
import { parseQuery } from '../lib/parseBody'
import { requireAuth } from '../middleware/auth'

export const ticketsRouter = Router()

// Any signed-in user (agent or admin). Filter by status/category, sort (newest first by default) and paginate.
ticketsRouter.get('/', requireAuth, async (req, res) => {
  const query = parseQuery(ticketListQuerySchema, req, res)
  if (!query) return
  const { status, category, sort, order, page, pageSize } = query

  const where = { status, category }
  const [tickets, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      select: {
        id: true,
        subject: true,
        senderName: true,
        senderEmail: true,
        status: true,
        category: true,
        createdAt: true,
      },
      // id breaks ties so pages never overlap or skip rows
      orderBy: [{ [sort]: order }, { id: order }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ])
  res.json({ tickets, total, page, pageSize })
})
