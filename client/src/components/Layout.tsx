import { useQueryClient } from '@tanstack/react-query'
import { LayoutDashboardIcon, TicketIcon, UsersIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import Footer, { MobileCopyright } from '@/components/Footer'
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

// Bottom navigation button for small screens: an icon in a round button, filled when its section is current. The
// label is only for screen readers and the hover tooltip.
function BottomNavItem({ to, icon: Icon, children }: { to: string; icon: typeof TicketIcon; children: string }) {
  return (
    <NavLink to={to} aria-label={children} title={children} className="flex flex-1 items-center justify-center py-2">
      {({ isActive }) => (
        <span
          className={cn(
            'flex size-11 items-center justify-center rounded-full transition-colors',
            isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent',
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
      )}
    </NavLink>
  )
}

// Layout for the app pages: renders the nav bar. The home page is public, so there may be no session: the section
// links stay visible and lead to the login page (ProtectedRoute), and the header offers Sign in instead of Sign out.
export default function Layout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  // A signed-out visitor on the public home page sees no Dashboard/Tickets links, only Sign in
  const { pathname } = useLocation()
  const showSections = !!session || pathname !== '/'

  const [signOutFailed, setSignOutFailed] = useState(false)

  async function handleSignOut() {
    setSignOutFailed(false)
    const { error } = await authClient.signOut()
    // Stay put when the server did not end the session, so the user is never shown as signed out while still signed in
    if (error) {
      setSignOutFailed(true)
      return
    }
    // Drop cached server data so the next user never sees the previous user's responses
    queryClient.clear()
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-muted/40 pb-26 sm:pb-24">
      <nav className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b bg-background/80 px-4 py-3 sm:px-6 shadow-sm backdrop-blur">
        <Link to="/" aria-label="Helpdesk home" className="shrink-0 transition-opacity hover:opacity-80">
          <Logo className="text-lg" />
        </Link>
        <div className="mr-auto ml-4 hidden items-center gap-2 sm:flex">
          {showSections && (
            <>
              <NavItem to="/dashboard">Dashboard</NavItem>
              <NavItem to="/tickets">Tickets</NavItem>
            </>
          )}
          {session?.user.role === Role.ADMIN && <NavItem to="/users">Users</NavItem>}
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          {signOutFailed && (
            <p role="alert" className="text-sm text-destructive">
              Could not sign out. Try again.
            </p>
          )}
          {session ? (
            <>
              <span className="hidden max-w-40 truncate rounded-full bg-muted px-3 py-1 text-sm font-medium sm:inline">{session.user.name}</span>
              <Button type="button" variant="outline" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </nav>
      <Outlet />
      <Footer showSections={showSections} />
      <MobileCopyright />
      {/* Phones: the section links live in a bottom bar instead of the header */}
      {showSections && (
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-10 flex h-16 box-content border-t bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-sm backdrop-blur sm:hidden"
        >
          <BottomNavItem to="/dashboard" icon={LayoutDashboardIcon}>
            Dashboard
          </BottomNavItem>
          <BottomNavItem to="/tickets" icon={TicketIcon}>
            Tickets
          </BottomNavItem>
          {session?.user.role === Role.ADMIN && (
            <BottomNavItem to="/users" icon={UsersIcon}>
              Users
            </BottomNavItem>
          )}
        </nav>
      )}
    </div>
  )
}
