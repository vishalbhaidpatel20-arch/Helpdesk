import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Layout from './Layout'

const { useSession, signOut } = vi.hoisted(() => ({ useSession: vi.fn(), signOut: vi.fn() }))
vi.mock('../lib/auth-client', () => ({ authClient: { useSession, signOut } }))

function renderLayout(path = '/dashboard') {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<p>Home page</p>} />
            <Route path="/dashboard" element={<p>Dashboard page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Layout sign out', () => {
  beforeEach(() => {
    useSession.mockReturnValue({ data: { user: { name: 'Ada Lovelace', role: 'AGENT' } } })
    signOut.mockReset()
  })

  it('goes to the home page after a successful sign out', async () => {
    signOut.mockResolvedValue({ error: null })
    renderLayout()

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })

  it('stays on the page and shows an error when the server refuses to sign out', async () => {
    signOut.mockResolvedValue({ error: { status: 403, message: 'Invalid origin' } })
    renderLayout()

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not sign out')
    await waitFor(() => expect(screen.getByText('Dashboard page')).toBeInTheDocument())
  })

  it('shows Sign in instead of Sign out when there is no session', () => {
    useSession.mockReturnValue({ data: null })
    renderLayout()

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
  })

  it('hides the Dashboard and Tickets links from a signed-out visitor on the home page', () => {
    useSession.mockReturnValue({ data: null })
    renderLayout('/')

    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Tickets' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('keeps the Dashboard and Tickets links for a signed-in user on the home page', () => {
    renderLayout('/')

    expect(screen.getAllByRole('link', { name: 'Dashboard' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Tickets' }).length).toBeGreaterThan(0)
  })
})
