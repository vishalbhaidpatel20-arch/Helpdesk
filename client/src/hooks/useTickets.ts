import { useQuery } from '@tanstack/react-query'
import type { Ticket } from '@helpdesk/core'
import { api } from '@/lib/api'

export function useTickets() {
  return useQuery({
    queryKey: ['tickets'],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<{ tickets: Ticket[] }>('/tickets', { signal })
      return data.tickets
    },
  })
}
