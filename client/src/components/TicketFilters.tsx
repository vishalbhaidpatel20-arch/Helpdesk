import { TicketCategory, TicketStatus, type TicketListQuery } from '@helpdesk/core'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { categoryLabels, statusLabels } from '@/lib/tickets'

type Props = {
  params: TicketListQuery
  onChange: (changes: Partial<TicketListQuery>) => void
}

export default function TicketFilters({ params, onChange }: Props) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <Label htmlFor="ticket-status">Status</Label>
        <NativeSelect
          id="ticket-status"
          value={params.status ?? ''}
          onChange={(e) =>
            onChange({ status: e.target.value ? (e.target.value as TicketStatus) : undefined })
          }
        >
          <option value="">All</option>
          {Object.values(TicketStatus).map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="ticket-category">Category</Label>
        <NativeSelect
          id="ticket-category"
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
