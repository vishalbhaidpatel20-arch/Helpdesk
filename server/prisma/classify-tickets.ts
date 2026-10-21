// Queues a classification job for every ticket that has no category yet (tickets created before
// classification existed, or whose job failed). The running server's pg-boss worker processes them.
import { prisma } from '../src/db'
import { PROCESS_TICKET_QUEUE, startQueue, stopQueue, enqueueProcessTicket } from '../src/lib/queue'

const tickets = await prisma.ticket.findMany({ where: { category: null }, select: { id: true }, orderBy: { id: 'asc' } })
await startQueue(false)
for (const { id } of tickets) await enqueueProcessTicket(id)
console.log(`Queued ${tickets.length} tickets on "${PROCESS_TICKET_QUEUE}"`)
await stopQueue()
await prisma.$disconnect()
