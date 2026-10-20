import { Navigate, Outlet } from 'react-router'
import { authClient } from '../lib/auth-client'

// Guards authenticated pages: redirects to /login without a session. UI-only; protect server routes separately.
export default function ProtectedRoute() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) return null
  if (!session) return <Navigate to="/login" replace />

  return <Outlet />
}
