import type { Ticket } from '@helpdesk/core'
import Field from '@/components/Field'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/tickets'

// The ticket's email: sender, dates, subject and message
export default function TicketDetail({ ticket }: { ticket: Ticket }) {
  return (
    <>
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
    </>
  )
}
