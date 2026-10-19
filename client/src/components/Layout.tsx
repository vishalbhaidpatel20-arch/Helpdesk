import { Link, Navigate, Outlet, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { authClient } from '../lib/auth-client'

// Layout for authenticated pages: redirects to /login without a session and renders the nav bar
export default function Layout() {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()

  if (isPending) return null
  if (!session) return <Navigate to="/login" replace />

  async function handleSignOut() {
    await authClient.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <nav className="flex items-center justify-between border-b bg-background px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold">Helpdesk</span>
          {session.user.role === 'ADMIN' && (
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
