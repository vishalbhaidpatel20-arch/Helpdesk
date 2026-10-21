import { TicketCategory, TicketStatus, type Ticket } from '@helpdesk/core'
import Field from '@/components/Field'
import TicketAssignee from '@/components/TicketAssignee'
import { NativeSelect } from '@/components/ui/native-select'
import { useUpdateTicket } from '@/hooks/useTicket'
import { categoryLabels, statusLabels } from '@/lib/tickets'

// The ticket's editable fields: assignee, status and category. Each change is saved right away.
export default function UpdateTicket({ ticket }: { ticket: Ticket }) {
  const update = useUpdateTicket(String(ticket.id))

  return (
    <>
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
    </>
  )
}
