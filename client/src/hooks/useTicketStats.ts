import { useQuery } from '@tanstack/react-query'
import type { TicketStats } from '@helpdesk/core'
import { api } from '@/lib/api'

export function useTicketStats() {
  return useQuery({
    queryKey: ['ticket-stats'],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<TicketStats>('/stats', { signal })
      return data
    },
  })
}
