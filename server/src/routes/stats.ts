import { TICKETS_PER_DAY_DAYS, type TicketStats } from '@helpdesk/core'
import { Router } from 'express'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'

export const statsRouter = Router()

// Any signed-in user. The numbers on the dashboard, computed by the `ticket_stats` database function
// (see the ticket_stats_function migration), which returns the TicketStats shape as JSON.
statsRouter.get('/', requireAuth, async (_req, res) => {
  const [{ stats }] = await prisma.$queryRaw<{ stats: TicketStats }[]>`
    SELECT ticket_stats(${TICKETS_PER_DAY_DAYS}::integer) AS stats`
  res.json(stats)
})
