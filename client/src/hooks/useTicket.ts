import { useQuery } from '@tanstack/react-query'
import type { TicketDetail } from '@helpdesk/core'
import { api } from '@/lib/api'

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<TicketDetail>(`/tickets/${id}`, { signal })
      return data
    },
    enabled: id !== undefined,
  })
}
