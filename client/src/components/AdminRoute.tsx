import { Navigate, Outlet } from 'react-router'
import { Role } from '@/lib/roles'
import { authClient } from '../lib/auth-client'

// Guards admin-only pages: non-admins are redirected home. UI-only; protect server routes separately.
export default function AdminRoute() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) return null
  if (session?.user.role !== Role.ADMIN) return <Navigate to="/" replace />

  return <Outlet />
}
