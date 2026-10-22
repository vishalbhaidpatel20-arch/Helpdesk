import { ticketListQuerySchema, type TicketListQuery } from '@helpdesk/core'
import { useSearchParams } from 'react-router'
import { useDefaultAssignee } from '@/hooks/useDefaultAssignee'

// The ticket list's filters, sort and page live in the URL so they survive reloads and can be shared.
// Invalid or missing values fall back to the schema defaults (newest first, page 1). Agents see their own tickets
// unless the URL says assignee=all; admins see every ticket.
export function useTicketParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const defaultAssignee = useDefaultAssignee()

  const parsed = ticketListQuerySchema.safeParse(Object.fromEntries(searchParams))
  const base: TicketListQuery = parsed.success ? parsed.data : ticketListQuerySchema.parse({})
  const params: TicketListQuery = { ...base, assignee: base.assignee ?? defaultAssignee }

  // Changing anything but the page goes back to page 1
  function setParams(changes: Partial<TicketListQuery>) {
    const next: TicketListQuery = { ...params, page: 1, ...changes }
    const search = new URLSearchParams()
    if (next.status) search.set('status', next.status)
    if (next.category) search.set('category', next.category)
    if (next.assignee) search.set('assignee', next.assignee)
    if (next.search) search.set('search', next.search)
    search.set('sort', next.sort)
    search.set('order', next.order)
    search.set('page', String(next.page))
    setSearchParams(search)
  }

  return { params, setParams }
}
