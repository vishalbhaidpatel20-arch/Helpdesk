import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Role } from '@/lib/roles'

export type User = {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<{ users: User[] }>('/users', { signal })
      return data.users
    },
  })
}

export type NewUser = { name: string; email: string; password: string }

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: NewUser) => {
      const { data } = await api.post<{ user: User }>('/users', values)
      return data.user
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}
