import { Navigate, Outlet, useLocation } from 'react-router'
import { authClient } from '../lib/auth-client'

// Guards authenticated pages: redirects to /login without a session, remembering the page that was asked for so the
// login page can send the user back to it. UI-only; protect server routes separately.
export default function ProtectedRoute() {
  const { data: session, isPending } = authClient.useSession()
  const location = useLocation()

  if (isPending) return null
  if (!session) {
    const from = location.pathname + location.search
    return <Navigate to="/login" replace state={{ from }} />
  }

  return <Outlet />
}
