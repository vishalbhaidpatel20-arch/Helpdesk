import { useQuery } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'
import AdminRoute from './components/AdminRoute'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { Skeleton } from './components/ui/skeleton'
import { api } from './lib/api'
import LoginPage from './pages/LoginPage'
import TicketDetailPage from './pages/TicketDetailPage'
import TicketsPage from './pages/TicketsPage'
import UsersPage from './pages/UsersPage'

function Home() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: async ({ signal }) => (await api.get<{ status: string }>('/health', { signal })).data.status,
  })

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-3xl font-bold">Home</h1>
      <div className="mt-2 flex items-center gap-2 text-muted-foreground" aria-busy={isPending}>
        <span>API status:</span>
        {isPending ? <Skeleton className="h-4 w-16" /> : <span>{isError ? 'unreachable' : data}</span>}
      </div>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/tickets/:id" element={<TicketDetailPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
