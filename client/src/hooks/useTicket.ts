import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Ticket, UpdateTicketInput } from '@helpdesk/core'
import { api } from '@/lib/api'

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Ticket>(`/tickets/${id}`, { signal })
      return data
    },
    enabled: id !== undefined,
  })
}

// Updates the status, category and/or assignee; only the fields passed are changed
export function useUpdateTicket(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: UpdateTicketInput) => {
      const { data } = await api.patch<Ticket>(`/tickets/${id}`, values)
      return data
    },
    onSuccess: (ticket) => {
      queryClient.setQueryData(['ticket', id], ticket)
      // The list shows status and category, so refetch it next time it is visited
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}
