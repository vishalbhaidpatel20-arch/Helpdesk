import { TicketStatus, type Ticket, type TicketListQuery, type TicketSortField } from '@helpdesk/core'
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from 'lucide-react'
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
import { categoryLabels, statusLabels } from '@/lib/tickets'

type Props = {
  // undefined while the first page loads
  tickets: Ticket[] | undefined
  params: Pick<TicketListQuery, 'sort' | 'order'>
  onSort: (field: TicketSortField) => void
}

function SortableHead({
  field,
  label,
  params,
  onSort,
}: { field: TicketSortField; label: string } & Omit<Props, 'tickets'>) {
  const active = params.sort === field
  const Icon = active ? (params.order === 'asc' ? ArrowUpIcon : ArrowDownIcon) : ArrowUpDownIcon

  return (
    <TableHead aria-sort={active ? (params.order === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 rounded-sm font-medium hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {label}
        <Icon className="size-3.5" aria-hidden />
      </button>
    </TableHead>
  )
}

export default function TicketsTable({ tickets, params, onSort }: Props) {
  return (
    <Table className="mt-4" aria-busy={tickets === undefined}>
      <TableHeader>
        <TableRow>
          <SortableHead field="subject" label="Subject" params={params} onSort={onSort} />
          <TableHead>Sender</TableHead>
          <SortableHead field="status" label="Status" params={params} onSort={onSort} />
          <TableHead>Category</TableHead>
          <SortableHead field="createdAt" label="Received" params={params} onSort={onSort} />
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
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
            </TableRow>
          ))
        ) : tickets.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              No tickets found
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
              <TableCell className="text-muted-foreground">
                {ticket.category ? categoryLabels[ticket.category] : '—'}
              </TableCell>
              <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
