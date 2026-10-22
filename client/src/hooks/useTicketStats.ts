import { useQuery } from '@tanstack/react-query'
import type { TicketAssigneeFilter, TicketStats } from '@helpdesk/core'
import { api } from '@/lib/api'

export function useTicketStats(assignee: TicketAssigneeFilter) {
  return useQuery({
    queryKey: ['ticket-stats', assignee],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<TicketStats>('/stats', { params: { assignee }, signal })
      return data
    },
  })
}
