import { TicketStatus } from '@helpdesk/core'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTickets } from '@/hooks/useTickets'

const statusLabels: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Open',
  [TicketStatus.RESOLVED]: 'Resolved',
  [TicketStatus.CLOSED]: 'Closed',
}

export default function TicketsTable() {
  const { data: tickets, error } = useTickets()

  return error ? (
    <p role="alert" className="mt-4 text-sm text-destructive">
      Failed to load tickets
    </p>
  ) : (
    <Table className="mt-6" aria-busy={tickets === undefined}>
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead>Sender</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Received</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets === undefined ? (
          Array.from({ length: 5 }, (_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-56" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-40" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
            </TableRow>
          ))
        ) : tickets.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              No tickets yet
            </TableCell>
          </TableRow>
        ) : (
          tickets.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell className="font-medium">{ticket.subject}</TableCell>
              <TableCell>
                <div>{ticket.senderName}</div>
                <div className="text-muted-foreground">{ticket.senderEmail}</div>
              </TableCell>
              <TableCell>
                <Badge variant={ticket.status === TicketStatus.OPEN ? 'default' : 'secondary'}>
                  {statusLabels[ticket.status]}
                </Badge>
              </TableCell>
              <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
