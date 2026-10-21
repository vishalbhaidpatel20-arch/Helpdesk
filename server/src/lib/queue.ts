import { PgBoss } from 'pg-boss'
import { classifyTicketJob } from './classifyTicket'

export const CLASSIFY_TICKET_QUEUE = 'classify-ticket'

export type ClassifyTicketJob = { ticketId: number }

// pg-boss keeps its jobs in its own `pgboss` schema of the same database, so they survive restarts
const boss = new PgBoss(process.env.DATABASE_URL!)
boss.on('error', (err) => console.error('pg-boss error', err))

// withWorker: false only sends jobs (used by scripts), leaving processing to the server
export async function startQueue(withWorker = true) {
  await boss.start()
  await boss.createQueue(CLASSIFY_TICKET_QUEUE)
  if (!withWorker) return
  // A thrown error makes pg-boss retry the job (backing off), so only provider failures should throw
  await boss.work<ClassifyTicketJob>(CLASSIFY_TICKET_QUEUE, async ([job]) => {
    await classifyTicketJob(job!.data.ticketId)
  })
}

export function stopQueue() {
  return boss.stop()
}

// Never throws: a queue problem must not fail the request that created the ticket
export async function enqueueClassifyTicket(ticketId: number) {
  try {
    await boss.send(CLASSIFY_TICKET_QUEUE, { ticketId } satisfies ClassifyTicketJob, { retryLimit: 3, retryDelay: 30, retryBackoff: true })
  } catch (err) {
    console.error(`Ticket ${ticketId}: could not queue classification`, err)
  }
}
