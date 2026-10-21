import { useQueryClient } from '@tanstack/react-query'
import { Link, Outlet, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Role } from '@/lib/roles'
import { authClient } from '../lib/auth-client'

// Layout for authenticated pages: renders the nav bar. Rendered inside ProtectedRoute, which guarantees a session.
export default function Layout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()

  if (!session) return null

  async function handleSignOut() {
    await authClient.signOut()
    // Drop cached server data so the next user never sees the previous user's responses
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <nav className="flex items-center justify-between border-b bg-background px-6 py-3">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-bold">
            Helpdesk
          </Link>
          <Link to="/tickets" className="text-sm text-muted-foreground hover:text-foreground">
            Tickets
          </Link>
          {session.user.role === Role.ADMIN && (
            <Link to="/users" className="text-sm text-muted-foreground hover:text-foreground">
              Users
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{session.user.name}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </nav>
      <Outlet />
    </>
  )
}
