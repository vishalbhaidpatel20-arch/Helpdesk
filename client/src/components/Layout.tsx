import { Navigate, Outlet, useNavigate } from 'react-router'
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
      <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <span className="text-lg font-bold">Helpdesk</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700">{session.user.name}</span>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      </nav>
      <Outlet />
    </>
  )
}
