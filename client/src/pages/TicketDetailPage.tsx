import { TicketStatus } from '@helpdesk/core'
import axios from 'axios'
import { ArrowLeftIcon } from 'lucide-react'
import { useParams } from 'react-router'
import AppLink from '@/components/AppLink'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useTicket } from '@/hooks/useTicket'
import { categoryLabels, statusLabels } from '@/lib/tickets'

export default function TicketDetailPage() {
  const { id } = useParams()
  const { data: ticket, error } = useTicket(id)

  return (
    <main className="mx-auto max-w-3xl p-8">
      <AppLink to="/tickets" className="inline-flex items-center gap-1">
        <ArrowLeftIcon className="size-4" aria-hidden />
        Back to tickets
      </AppLink>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {axios.isAxiosError(error) && error.response?.status === 404
            ? 'Ticket not found'
            : 'Failed to load ticket'}
        </p>
      ) : !ticket ? (
        <div className="mt-4 space-y-4" aria-busy="true">
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <article className="mt-4">
          <h1 className="text-3xl font-bold">{ticket.subject}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Badge variant={ticket.status === TicketStatus.OPEN ? 'default' : 'secondary'}>
              {statusLabels[ticket.status]}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {ticket.category ? categoryLabels[ticket.category] : 'Uncategorized'}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">From</dt>
            <dd>
              {ticket.senderName} ({ticket.senderEmail})
            </dd>
            <dt className="text-muted-foreground">Received</dt>
            <dd>{new Date(ticket.createdAt).toLocaleString()}</dd>
          </dl>
          {/* Email content is untrusted: render as plain text only */}
          <p className="mt-6 whitespace-pre-wrap rounded-md border p-4">{ticket.body}</p>
        </article>
      )}
    </main>
  )
}
