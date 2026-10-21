import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { UpdateUserInput } from '@helpdesk/core'
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

export type UserChanges = UpdateUserInput & { id: string }

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: UserChanges) => {
      const { data } = await api.patch<{ user: User }>(`/users/${id}`, values)
      return data.user
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}
