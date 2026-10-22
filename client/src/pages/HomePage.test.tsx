import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { renderWithQuery } from '@/test/renderWithQuery'
import HomePage from './HomePage'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))
vi.mock('@/lib/auth-client', () => ({
  authClient: { useSession: () => ({ data: { user: { name: 'Ada Lovelace' } } }) },
}))

const get = vi.mocked(api.get)

function renderHome() {
  return renderWithQuery(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('greets the user and links to tickets and the dashboard', () => {
    get.mockReturnValue(new Promise(() => {}))
    renderHome()

    expect(screen.getByRole('heading', { level: 1, name: 'Welcome home, Ada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View tickets' })).toHaveAttribute('href', '/tickets')
    expect(screen.getByRole('link', { name: 'Open dashboard' })).toHaveAttribute('href', '/dashboard')
  })

  it('lists the app features and how it works', () => {
    get.mockReturnValue(new Promise(() => {}))
    renderHome()

    expect(screen.getByText('Smart classification')).toBeInTheDocument()
    expect(screen.getByText('Live dashboard')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('shows the API status once loaded', async () => {
    get.mockResolvedValue({ data: { status: 'ok' } })
    renderHome()

    expect(await screen.findByText('ok')).toBeInTheDocument()
  })

  it('shows unreachable when the health check fails', async () => {
    get.mockRejectedValue(new Error('network'))
    renderHome()

    expect(await screen.findByText('unreachable')).toBeInTheDocument()
  })
})
