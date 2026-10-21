import { TicketStatus } from '@helpdesk/core'
import axios from 'axios'
import { ArrowLeftIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import AppLink from '@/components/AppLink'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import TicketAssignee from '@/components/TicketAssignee'
import { useAssignTicket, useTicket } from '@/hooks/useTicket'
import { categoryLabels, formatDateTime, statusLabels } from '@/lib/tickets'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-muted-foreground">{label}:</dt>
      <dd>{children}</dd>
    </div>
  )
}

export default function TicketDetailPage() {
  const { id } = useParams()
  const { data: ticket, error } = useTicket(id)
  const assign = useAssignTicket(id)

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
          <h1 className="text-3xl font-bold">Ticket #{ticket.id}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Badge variant={ticket.status === TicketStatus.OPEN ? 'default' : 'secondary'}>
              {statusLabels[ticket.status]}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {ticket.category ? categoryLabels[ticket.category] : 'Uncategorized'}
            </span>
          </div>
          {/* Two columns: sender and assignee on the first row, created and updated on the second */}
          <dl className="mt-4 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            <Field label="From">
              {ticket.senderName} ({ticket.senderEmail})
            </Field>
            <Field label="Assigned to">
              <div className="flex flex-wrap items-center gap-2">
                <TicketAssignee
                  assignedTo={ticket.assignedTo}
                  disabled={assign.isPending}
                  onChange={(assignedToId) => assign.mutate({ assignedToId })}
                />
                {assign.isError && (
                  <span role="alert" className="text-destructive">
                    Failed to assign ticket
                  </span>
                )}
              </div>
            </Field>
            <Field label="Created">{formatDateTime(ticket.createdAt)}</Field>
            <Field label="Updated">{formatDateTime(ticket.updatedAt)}</Field>
          </dl>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{ticket.subject}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Email content is untrusted: render as plain text only */}
              <p className="whitespace-pre-wrap">{ticket.body}</p>
            </CardContent>
          </Card>
        </article>
      )}
    </main>
  )
}
