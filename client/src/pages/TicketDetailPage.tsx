import { TicketCategory, TicketStatus } from '@helpdesk/core'
import axios from 'axios'
import { ArrowLeftIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import AppLink from '@/components/AppLink'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import TicketAssignee from '@/components/TicketAssignee'
import { useTicket, useUpdateTicket } from '@/hooks/useTicket'
import { categoryLabels, formatDateTime, statusLabels } from '@/lib/tickets'
import { cn } from '@/lib/utils'

// Label and value on one line, or the label above the value when stacked (for form controls)
function Field({ label, stacked, children }: { label: string; stacked?: boolean; children: ReactNode }) {
  return (
    <div className={cn('flex gap-2', stacked && 'flex-col gap-1')}>
      <dt className="shrink-0 text-muted-foreground">{stacked ? label : `${label}:`}</dt>
      <dd className={cn(stacked && 'flex flex-col items-start gap-1 *:w-full')}>{children}</dd>
    </div>
  )
}

export default function TicketDetailPage() {
  const { id } = useParams()
  const { data: ticket, error } = useTicket(id)
  const update = useUpdateTicket(id)

  return (
    <main className="mx-auto max-w-5xl p-8">
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
          {/* Two columns (stacked on small screens): the email on the left, the editable fields on the right */}
          <div className="mt-6 grid gap-8 md:grid-cols-[1fr_11rem]">
            <div className="min-w-0 space-y-6">
              <dl className="space-y-1 text-sm">
                <Field label="From">
                  {ticket.senderName} ({ticket.senderEmail})
                </Field>
                <Field label="Created">{formatDateTime(ticket.createdAt)}</Field>
                <Field label="Updated">{formatDateTime(ticket.updatedAt)}</Field>
              </dl>
              <Card>
                <CardHeader>
                  <CardTitle>{ticket.subject}</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Email content is untrusted: render as plain text only */}
                  <p className="whitespace-pre-wrap">{ticket.body}</p>
                </CardContent>
              </Card>
            </div>
            <aside className="space-y-4 text-sm">
              <dl className="space-y-4">
                <Field label="Assigned to" stacked>
                  <TicketAssignee
                    assignedTo={ticket.assignedTo}
                    disabled={update.isPending}
                    onChange={(assignedToId) => update.mutate({ assignedToId })}
                  />
                </Field>
                <Field label="Status" stacked>
                  <NativeSelect
                    aria-label="Status"
                    value={ticket.status}
                    disabled={update.isPending}
                    onChange={(e) => update.mutate({ status: e.target.value as TicketStatus })}
                  >
                    {Object.values(TicketStatus).map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Category" stacked>
                  <NativeSelect
                    aria-label="Category"
                    value={ticket.category ?? ''}
                    disabled={update.isPending}
                    onChange={(e) =>
                      update.mutate({ category: e.target.value ? (e.target.value as TicketCategory) : null })
                    }
                  >
                    <option value="">Uncategorized</option>
                    {Object.values(TicketCategory).map((category) => (
                      <option key={category} value={category}>
                        {categoryLabels[category]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </dl>
              {update.isError && (
                <p role="alert" className="text-destructive">
                  Failed to update ticket
                </p>
              )}
            </aside>
          </div>
        </article>
      )}
    </main>
  )
}
