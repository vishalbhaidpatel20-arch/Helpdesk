import axios from 'axios'
import { ArrowLeftIcon } from 'lucide-react'
import { useParams } from 'react-router'
import AppLink from '@/components/AppLink'
import { Skeleton } from '@/components/ui/skeleton'
import ReplyForm from '@/components/ReplyForm'
import ReplyThread from '@/components/ReplyThread'
import TicketDetail from '@/components/TicketDetail'
import TicketSummary from '@/components/TicketSummary'
import UpdateTicket from '@/components/UpdateTicket'
import { useTicket } from '@/hooks/useTicket'

export default function TicketDetailPage() {
  const { id } = useParams()
  const { data: ticket, error } = useTicket(id)

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
              <TicketDetail ticket={ticket} />
              <TicketSummary ticketId={id} />
              <section aria-labelledby="replies-heading" className="space-y-4">
                <h2 id="replies-heading" className="text-xl font-semibold">
                  Replies
                </h2>
                <ReplyThread ticketId={id} />
                <ReplyForm ticketId={id} />
              </section>
            </div>
            <aside className="space-y-4 text-sm">
              <UpdateTicket ticket={ticket} />
            </aside>
          </div>
        </article>
      )}
    </main>
  )
}
