import { ticketListQuerySchema, type TicketListQuery } from '@helpdesk/core'
import { useSearchParams } from 'react-router'

// The ticket list's filters, sort and page live in the URL so they survive reloads and can be shared.
// Invalid or missing values fall back to the schema defaults (newest first, page 1).
export function useTicketParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const parsed = ticketListQuerySchema.safeParse(Object.fromEntries(searchParams))
  const params: TicketListQuery = parsed.success ? parsed.data : ticketListQuerySchema.parse({})

  // Changing anything but the page goes back to page 1
  function setParams(changes: Partial<TicketListQuery>) {
    const next: TicketListQuery = { ...params, page: 1, ...changes }
    const search = new URLSearchParams()
    if (next.status) search.set('status', next.status)
    if (next.category) search.set('category', next.category)
    search.set('sort', next.sort)
    search.set('order', next.order)
    search.set('page', String(next.page))
    setSearchParams(search)
  }

  return { params, setParams }
}
