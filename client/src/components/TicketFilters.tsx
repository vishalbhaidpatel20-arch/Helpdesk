import { AGENT_TICKET_STATUSES, TicketCategory, type TicketListQuery } from '@helpdesk/core'
import TicketSearch from '@/components/TicketSearch'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { categoryLabels, statusLabels } from '@/lib/tickets'

type Props = {
  params: TicketListQuery
  onChange: (changes: Partial<TicketListQuery>) => void
}

export default function TicketFilters({ params, onChange }: Props) {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
      <TicketSearch value={params.search} onChange={(search) => onChange({ search })} />
      <div className="flex items-center justify-between gap-2 sm:justify-start">
        <Label htmlFor="ticket-assignee">Show</Label>
        <NativeSelect
          id="ticket-assignee"
          className="w-44"
          value={params.assignee ?? 'all'}
          onChange={(e) => onChange({ assignee: e.target.value as 'me' | 'all' })}
        >
          <option value="me">My tickets</option>
          <option value="all">All tickets</option>
        </NativeSelect>
      </div>
      <div className="flex items-center justify-between gap-2 sm:justify-start">
        <Label htmlFor="ticket-status">Status</Label>
        <NativeSelect
          id="ticket-status"
          className="w-44"
          value={params.status ?? ''}
          onChange={(e) =>
            onChange({ status: e.target.value ? (e.target.value as (typeof AGENT_TICKET_STATUSES)[number]) : undefined })
          }
        >
          <option value="">All</option>
          {AGENT_TICKET_STATUSES.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex items-center justify-between gap-2 sm:justify-start">
        <Label htmlFor="ticket-category">Category</Label>
        <NativeSelect
          id="ticket-category"
          className="w-44"
          value={params.category ?? ''}
          onChange={(e) =>
            onChange({ category: e.target.value ? (e.target.value as TicketCategory) : undefined })
          }
        >
          <option value="">All</option>
          {Object.values(TicketCategory).map((category) => (
            <option key={category} value={category}>
              {categoryLabels[category]}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  )
}
