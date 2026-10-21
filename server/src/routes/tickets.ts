import { assignTicketSchema, ticketListQuerySchema } from '@helpdesk/core'
import { Router } from 'express'
import { Role } from '../../generated/enums'
import { prisma } from '../db'
import { parseBody, parseQuery } from '../lib/parseBody'
import { requireAuth } from '../middleware/auth'

export const ticketsRouter = Router()

const detailSelect = {
  id: true,
  subject: true,
  body: true,
  senderName: true,
  senderEmail: true,
  status: true,
  category: true,
  assignedTo: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
}

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

// Any signed-in user. The agents a ticket can be assigned to (must be declared before /:id).
ticketsRouter.get('/agents', requireAuth, async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { deletedAt: null, role: Role.AGENT },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  res.json({ agents })
})

// A non-numeric id is treated as not found
function parseTicketId(value: string) {
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : undefined
}

// Any signed-in user.
ticketsRouter.get('/:id', requireAuth, async (req, res) => {
  const id = parseTicketId(String(req.params.id))
  const ticket =
    id === undefined ? null : await prisma.ticket.findUnique({ where: { id }, select: detailSelect })
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' })
    return
  }
  res.json(ticket)
})

// Any signed-in user. Assigns the ticket to an agent, or unassigns it with null.
ticketsRouter.patch('/:id', requireAuth, async (req, res) => {
  const body = parseBody(assignTicketSchema, req, res)
  if (!body) return
  const id = parseTicketId(String(req.params.id))

  if (id === undefined || !(await prisma.ticket.findUnique({ where: { id } }))) {
    res.status(404).json({ error: 'Ticket not found' })
    return
  }
  if (body.assignedToId !== null) {
    const agent = await prisma.user.findFirst({
      where: { id: body.assignedToId, deletedAt: null, role: Role.AGENT },
    })
    if (!agent) {
      res.status(400).json({ error: 'Agent not found' })
      return
    }
  }

  const ticket = await prisma.ticket.update({
    where: { id },
    data: { assignedToId: body.assignedToId },
    select: detailSelect,
  })
  res.json(ticket)
})
