import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateReplyInput, PolishReplyInput, TicketReply } from '@helpdesk/core'
import { api } from '@/lib/api'

export function useReplies(ticketId: string | undefined) {
  return useQuery({
    queryKey: ['ticket', ticketId, 'replies'],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<{ replies: TicketReply[] }>(`/tickets/${ticketId}/replies`, { signal })
      return data.replies
    },
    enabled: ticketId !== undefined,
  })
}

export function usePolishReply(ticketId: string | undefined) {
  return useMutation({
    mutationFn: async (values: PolishReplyInput) => {
      const { data } = await api.post<{ body: string }>(`/tickets/${ticketId}/replies/polish`, values)
      return data.body
    },
  })
}

export function useCreateReply(ticketId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: CreateReplyInput) => {
      const { data } = await api.post<TicketReply>(`/tickets/${ticketId}/replies`, values)
      return data
    },
    onSuccess: (reply) => {
      queryClient.setQueryData<TicketReply[]>(['ticket', ticketId, 'replies'], (replies) => [
        ...(replies ?? []),
        reply,
      ])
    },
  })
}
