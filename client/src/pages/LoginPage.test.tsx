import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from './LoginPage'

const { useSession, signInEmail } = vi.hoisted(() => ({ useSession: vi.fn(), signInEmail: vi.fn() }))
vi.mock('../lib/auth-client', () => ({ authClient: { useSession, signIn: { email: signInEmail } } }))

function renderLogin(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state }]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
        <Route path="/tickets" element={<p>Tickets page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function signIn() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-password' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('LoginPage', () => {
  beforeEach(() => {
    useSession.mockReset()
    signInEmail.mockReset()
    useSession.mockReturnValue({ data: null, isPending: false })
    signInEmail.mockResolvedValue({ error: null })
  })

  it('returns to the page the visitor asked for after signing in', async () => {
    renderLogin({ from: '/tickets' })
    signIn()

    expect(await screen.findByText('Tickets page')).toBeInTheDocument()
  })

  it('goes to the dashboard when there is no requested page', async () => {
    renderLogin()
    signIn()

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument()
  })

  it('ignores a requested page that is not an app path', async () => {
    renderLogin({ from: '//evil.example.com' })
    signIn()

    await waitFor(() => expect(screen.getByText('Dashboard page')).toBeInTheDocument())
  })

  it('sends a user who is already signed in to the requested page', () => {
    useSession.mockReturnValue({ data: { user: { name: 'Ada' } }, isPending: false })
    renderLogin({ from: '/tickets' })

    expect(screen.getByText('Tickets page')).toBeInTheDocument()
  })
})
