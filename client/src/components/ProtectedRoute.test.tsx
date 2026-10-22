import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProtectedRoute from './ProtectedRoute'

const useSession = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth-client', () => ({ authClient: { useSession } }))
vi.mock('../lib/auth-client', () => ({ authClient: { useSession } }))

function LoginProbe() {
  const { state } = useLocation()
  return <p>Login page, from {(state as { from?: string } | null)?.from}</p>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/tickets" element={<p>Tickets page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useSession.mockReset()
  })

  it('sends a signed-out visitor to the login page and remembers the page they asked for', () => {
    useSession.mockReturnValue({ data: null, isPending: false })
    renderAt('/tickets?status=OPEN')

    expect(screen.getByText('Login page, from /tickets?status=OPEN')).toBeInTheDocument()
  })

  it('shows the page to a signed-in user', () => {
    useSession.mockReturnValue({ data: { user: { name: 'Ada' } }, isPending: false })
    renderAt('/tickets')

    expect(screen.getByText('Tickets page')).toBeInTheDocument()
  })

  it('renders nothing while the session is loading', () => {
    useSession.mockReturnValue({ data: null, isPending: true })
    const { container } = renderAt('/tickets')

    expect(container).toBeEmptyDOMElement()
  })
})
