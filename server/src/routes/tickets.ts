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
  const { status, category, search, sort, order, page, pageSize } = query

  // Case-insensitive substring match on the text fields. Prisma does not escape the LIKE wildcards
  // (% and _) or the escape character itself, so do it here to match them literally.
  const contains = search
    ? { contains: search.replace(/[\\%_]/g, '\\$&'), mode: 'insensitive' as const }
    : undefined
  const where = {
    status,
    category,
    ...(contains && {
      OR: [
        { subject: contains },
        { senderName: contains },
        { senderEmail: contains },
        { body: contains },
      ],
    }),
  }
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

// Any signed-in user. A non-numeric id is treated as not found.
ticketsRouter.get('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const ticket = Number.isSafeInteger(id)
    ? await prisma.ticket.findUnique({
        where: { id },
        select: {
          id: true,
          subject: true,
          body: true,
          senderName: true,
          senderEmail: true,
          status: true,
          category: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    : null
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' })
    return
  }
  res.json(ticket)
})
