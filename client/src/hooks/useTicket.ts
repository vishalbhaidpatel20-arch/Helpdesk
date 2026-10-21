import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AssignTicketInput, TicketDetail } from '@helpdesk/core'
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

export function useAssignTicket(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: AssignTicketInput) => {
      const { data } = await api.patch<TicketDetail>(`/tickets/${id}`, values)
      return data
    },
    onSuccess: (ticket) => {
      queryClient.setQueryData(['ticket', id], ticket)
    },
  })
}
