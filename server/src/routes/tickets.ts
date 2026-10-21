import { createReplySchema, polishReplySchema, ticketListQuerySchema, updateTicketSchema } from '@helpdesk/core'
import { Router } from 'express'
import { Role } from '../../generated/enums'
import { prisma } from '../db'
import { parseBody, parseQuery } from '../lib/parseBody'
import { polishReply } from '../lib/polishReply'
import { requireAuth, type Session } from '../middleware/auth'

export const ticketsRouter = Router()

const ticketSelect = {
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
      select: ticketSelect,
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
    id === undefined ? null : await prisma.ticket.findUnique({ where: { id }, select: ticketSelect })
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' })
    return
  }
  res.json(ticket)
})

// Any signed-in user. Updates the status, category and/or assignee. Only the fields sent are changed;
// null unassigns the ticket or clears its category.
ticketsRouter.patch('/:id', requireAuth, async (req, res) => {
  const body = parseBody(updateTicketSchema, req, res)
  if (!body) return
  const id = parseTicketId(String(req.params.id))

  if (id === undefined || !(await prisma.ticket.findUnique({ where: { id } }))) {
    res.status(404).json({ error: 'Ticket not found' })
    return
  }
  if (typeof body.assignedToId === 'string') {
    const agent = await prisma.user.findFirst({
      where: { id: body.assignedToId, deletedAt: null, role: Role.AGENT },
    })
    if (!agent) {
      res.status(400).json({ error: 'Agent not found' })
      return
    }
  }

  const ticket = await prisma.ticket.update({ where: { id }, data: body, select: ticketSelect })
  res.json(ticket)
})

const replySelect = {
  id: true,
  body: true,
  author: { select: { id: true, name: true } },
  createdAt: true,
}

// Any signed-in user. The ticket's replies, oldest first.
ticketsRouter.get('/:id/replies', requireAuth, async (req, res) => {
  const id = parseTicketId(String(req.params.id))
  if (id === undefined || !(await prisma.ticket.findUnique({ where: { id } }))) {
    res.status(404).json({ error: 'Ticket not found' })
    return
  }
  const replies = await prisma.reply.findMany({
    where: { ticketId: id },
    select: replySelect,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  res.json({ replies })
})

// Any signed-in user. Returns an AI-polished version of the agent's draft; nothing is saved.
ticketsRouter.post('/:id/replies/polish', requireAuth, async (req, res) => {
  const body = parseBody(polishReplySchema, req, res)
  if (!body) return
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    res.status(503).json({ error: 'AI polishing is not configured' })
    return
  }
  const id = parseTicketId(String(req.params.id))
  const ticket =
    id === undefined
      ? null
      : await prisma.ticket.findUnique({ where: { id }, select: { subject: true, body: true, senderName: true } })
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' })
    return
  }
  try {
    res.json({ body: await polishReply(ticket, body.body, (res.locals.session as Session).user.name) })
  } catch (err) {
    // A provider failure (bad key, no credits, rate limit) is not our bug: log it and tell the agent
    console.error(err)
    res.status(502).json({ error: 'AI polishing is unavailable right now. Try again later.' })
  }
})

// Any signed-in user. Adds a reply authored by the signed-in user.
ticketsRouter.post('/:id/replies', requireAuth, async (req, res) => {
  const body = parseBody(createReplySchema, req, res)
  if (!body) return
  const id = parseTicketId(String(req.params.id))
  if (id === undefined || !(await prisma.ticket.findUnique({ where: { id } }))) {
    res.status(404).json({ error: 'Ticket not found' })
    return
  }
  const session = res.locals.session as Session
  const reply = await prisma.reply.create({
    data: { ticketId: id, authorId: session.user.id, body: body.body },
    select: replySelect,
  })
  res.status(201).json(reply)
})
