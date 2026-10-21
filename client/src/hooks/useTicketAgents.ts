import { useQuery } from '@tanstack/react-query'
import type { TicketAgent } from '@helpdesk/core'
import { api } from '@/lib/api'

export function useTicketAgents() {
  return useQuery({
    queryKey: ['ticket-agents'],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<{ agents: TicketAgent[] }>('/tickets/agents', { signal })
      return data.agents
    },
  })
}
