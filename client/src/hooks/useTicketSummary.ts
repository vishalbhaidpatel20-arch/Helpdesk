import { useMutation } from '@tanstack/react-query'
import type { TicketSummary } from '@helpdesk/core'
import { api } from '@/lib/api'

// Generates a fresh AI summary of the ticket and its replies on every call (nothing is cached or saved)
export function useSummarizeTicket(ticketId: string | undefined) {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<TicketSummary>(`/tickets/${ticketId}/summary`)
      return data.summary
    },
  })
}
