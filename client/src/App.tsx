import { useQuery } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'
import AdminRoute from './components/AdminRoute'
import Layout from './components/Layout'
import { api } from './lib/api'
import LoginPage from './pages/LoginPage'
import UsersPage from './pages/UsersPage'

function Home() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: async ({ signal }) => (await api.get<{ status: string }>('/health', { signal })).data.status,
  })
  const status = isPending ? 'checking...' : isError ? 'unreachable' : data

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-3xl font-bold">Home</h1>
      <p className="mt-2 text-muted-foreground">API status: {status}</p>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route element={<AdminRoute />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
