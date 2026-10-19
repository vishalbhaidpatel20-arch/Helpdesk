import { Navigate, Outlet } from 'react-router'
import { authClient } from '../lib/auth-client'

// Guards admin-only pages: non-admins are redirected home. UI-only; protect server routes separately.
export default function AdminRoute() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) return null
  if (session?.user.role !== 'ADMIN') return <Navigate to="/" replace />

  return <Outlet />
}
