import { useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import Footer from '@/components/Footer'
import Logo from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Role } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { authClient } from '../lib/auth-client'

// Nav link that highlights the current section with an indigo pill
function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )
      }
    >
      {children}
    </NavLink>
  )
}

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
    <div className="flex min-h-screen flex-col bg-muted/40">
      <nav className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b bg-background/80 px-4 py-3 sm:px-6 shadow-sm backdrop-blur">
        <Link to="/" aria-label="Helpdesk home" className="shrink-0 transition-opacity hover:opacity-80">
          <Logo className="text-lg" />
        </Link>
        <div className="order-last flex w-full items-center gap-1 overflow-x-auto sm:order-none sm:mr-auto sm:ml-4 sm:w-auto sm:gap-2">
          <NavItem to="/dashboard">Dashboard</NavItem>
          <NavItem to="/tickets">Tickets</NavItem>
          {session.user.role === Role.ADMIN && <NavItem to="/users">Users</NavItem>}
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="hidden max-w-40 truncate rounded-full bg-muted px-3 py-1 text-sm font-medium sm:inline">{session.user.name}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </nav>
      <Outlet />
      <Footer />
    </div>
  )
}
