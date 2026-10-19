import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type User = {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'AGENT'
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
