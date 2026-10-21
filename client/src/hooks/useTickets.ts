import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { TicketListQuery, TicketListResponse } from '@helpdesk/core'
import { api } from '@/lib/api'

export function useTickets(params: TicketListQuery) {
  return useQuery({
    queryKey: ['tickets', params],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<TicketListResponse>('/tickets', { params, signal })
      return data
    },
    // Keep showing the current page while the next one loads
    placeholderData: keepPreviousData,
  })
}
