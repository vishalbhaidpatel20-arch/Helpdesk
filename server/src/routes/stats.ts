import { statsQuerySchema, TICKETS_PER_DAY_DAYS, type TicketStats } from '@helpdesk/core'
import { Router } from 'express'
import { prisma } from '../db'
import { requireAuth, type Session } from '../middleware/auth'
import { parseQuery } from '../lib/parseBody'

export const statsRouter = Router()

// Any signed-in user. The numbers on the dashboard, computed by the `ticket_stats` database function
// (see the ticket_stats migrations), which returns the TicketStats shape as JSON. `assignee=me` limits them to
// the tickets assigned to the caller.
statsRouter.get('/', requireAuth, async (req, res) => {
  const query = parseQuery(statsQuerySchema, req, res)
  if (!query) return
  const assigneeId = query.assignee === 'me' ? (res.locals.session as Session).user.id : null
  const [{ stats }] = await prisma.$queryRaw<{ stats: TicketStats }[]>`
    SELECT ticket_stats(${TICKETS_PER_DAY_DAYS}::integer, ${assigneeId}::text) AS stats`
  res.json(stats)
})
