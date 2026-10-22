import { TicketStatus } from '@helpdesk/core'
import { PgBoss } from 'pg-boss'
import { prisma } from '../db'
import { processTicket } from './processTicket'
import { reportError } from './reportError'

export const PROCESS_TICKET_QUEUE = 'process-ticket'

export type ProcessTicketJob = { ticketId: number }

// pg-boss keeps its jobs in its own `pgboss` schema of the same database, so they survive restarts
const boss = new PgBoss(process.env.DATABASE_URL!)
boss.on('error', (err) => reportError('pg-boss error', err))

// withWorker: false only sends jobs (used by scripts), leaving processing to the server
export async function startQueue(withWorker = true) {
  await boss.start()
  await boss.createQueue(PROCESS_TICKET_QUEUE)
  if (!withWorker) return
  await boss.work<ProcessTicketJob>(PROCESS_TICKET_QUEUE, async ([job]) => {
    await processTicket(job!.data.ticketId)
  })
}

export function stopQueue() {
  return boss.stop()
}

// Never throws: a queue problem must not fail the request that created the ticket
export async function enqueueProcessTicket(ticketId: number) {
  try {
    await boss.send(PROCESS_TICKET_QUEUE, { ticketId } satisfies ProcessTicketJob)
  } catch (err) {
    reportError(`Ticket ${ticketId}: could not queue processing`, err)
    // Without a job a NEW ticket would stay hidden from the list forever, so open it for the agents
    await prisma.ticket.updateMany({ where: { id: ticketId, status: TicketStatus.NEW }, data: { status: TicketStatus.OPEN } })
  }
}
