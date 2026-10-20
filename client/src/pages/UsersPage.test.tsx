import { screen, within } from '@testing-library/react'
import { AxiosError, type AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { renderWithQuery } from '@/test/renderWithQuery'
import UsersPage from './UsersPage'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))

const get = vi.mocked(api.get)

const admin = {
  id: '1',
  name: 'Ada Admin',
  email: 'ada@example.com',
  role: 'ADMIN',
  createdAt: '2026-03-04T10:00:00.000Z',
}
const agent = {
  id: '2',
  name: 'Sam Agent',
  email: 'sam@example.com',
  role: 'AGENT',
  createdAt: '2026-05-06T10:00:00.000Z',
}

const renderPage = () => renderWithQuery(<UsersPage />)

function httpError(status: number) {
  return new AxiosError('Request failed', String(status), undefined, undefined, { status } as AxiosResponse)
}

describe('UsersPage', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('shows the heading and requests the users endpoint', async () => {
    get.mockResolvedValue({ data: { users: [admin] } })
    renderPage()

    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument()
    await screen.findByText(admin.email)
    expect(get).toHaveBeenCalledWith('/users', expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  describe('while loading', () => {
    beforeEach(() => {
      get.mockReturnValue(new Promise(() => {}))
    })

    it('keeps the table headers and marks the table busy', () => {
      renderPage()

      expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
      for (const name of ['Name', 'Email', 'Role', 'Created']) {
        expect(screen.getByRole('columnheader', { name })).toBeInTheDocument()
      }
    })

    it('renders skeleton placeholder rows instead of a loading message', () => {
      renderPage()

      // 1 header row + 5 skeleton rows
      expect(screen.getAllByRole('row')).toHaveLength(6)
      expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(20)
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    it('shows no error or empty state', () => {
      renderPage()

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.queryByText('No users found')).not.toBeInTheDocument()
    })
  })

  describe('with users', () => {
    beforeEach(() => {
      get.mockResolvedValue({ data: { users: [admin, agent] } })
    })

    it('renders one row per user with name, email, role and created date', async () => {
      renderPage()

      const adminRow = (await screen.findByText(admin.email)).closest('tr')!
      expect(within(adminRow).getByText(admin.name)).toBeInTheDocument()
      expect(within(adminRow).getByText('ADMIN')).toBeInTheDocument()
      expect(within(adminRow).getByText(new Date(admin.createdAt).toLocaleDateString())).toBeInTheDocument()

      const agentRow = screen.getByText(agent.email).closest('tr')!
      expect(within(agentRow).getByText(agent.name)).toBeInTheDocument()
      expect(within(agentRow).getByText('AGENT')).toBeInTheDocument()
      expect(within(agentRow).getByText(new Date(agent.createdAt).toLocaleDateString())).toBeInTheDocument()
    })

    it('has a header row plus a row for each user', async () => {
      renderPage()

      await screen.findByText(admin.email)
      expect(screen.getAllByRole('row')).toHaveLength(3)
    })

    it('replaces the skeletons and clears the busy state once loaded', async () => {
      renderPage()

      await screen.findByText(admin.email)
      expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0)
      expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'false')
    })

    it('renders the users in the order the API returns them', async () => {
      renderPage()

      await screen.findByText(admin.email)
      const [, first, second] = screen.getAllByRole('row')
      expect(first).toHaveTextContent(admin.email)
      expect(second).toHaveTextContent(agent.email)
    })
  })

  it('shows an empty state when there are no users', async () => {
    get.mockResolvedValue({ data: { users: [] } })
    renderPage()

    expect(await screen.findByText('No users found')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(2)
  })

  describe('on error', () => {
    it('shows "Not allowed" for a 403 response', async () => {
      get.mockRejectedValue(httpError(403))
      renderPage()

      expect(await screen.findByRole('alert')).toHaveTextContent('Not allowed')
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    it('shows a generic message for a 500 response', async () => {
      get.mockRejectedValue(httpError(500))
      renderPage()

      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load users')
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    it('shows a generic message for a 401 response', async () => {
      get.mockRejectedValue(httpError(401))
      renderPage()

      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load users')
    })

    it('shows a generic message for a network failure', async () => {
      get.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
      renderPage()

      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load users')
    })

    it('does not show skeletons or an empty state', async () => {
      get.mockRejectedValue(httpError(500))
      renderPage()

      await screen.findByRole('alert')
      expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0)
      expect(screen.queryByText('No users found')).not.toBeInTheDocument()
    })
  })
})
