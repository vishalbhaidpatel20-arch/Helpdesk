import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { AxiosError, type AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { Role } from '@/lib/roles'
import { renderWithQuery } from '@/test/renderWithQuery'
import UsersPage from './UsersPage'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))

const get = vi.mocked(api.get)

const admin = {
  id: '1',
  name: 'Ada Admin',
  email: 'ada@example.com',
  role: Role.ADMIN,
  createdAt: '2026-03-04T10:00:00.000Z',
}
const agent = {
  id: '2',
  name: 'Sam Agent',
  email: 'sam@example.com',
  role: Role.AGENT,
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
      expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(25)
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
      expect(within(adminRow).getByText(Role.ADMIN)).toBeInTheDocument()
      expect(within(adminRow).getByText(new Date(admin.createdAt).toLocaleDateString())).toBeInTheDocument()

      const agentRow = screen.getByText(agent.email).closest('tr')!
      expect(within(agentRow).getByText(agent.name)).toBeInTheDocument()
      expect(within(agentRow).getByText(Role.AGENT)).toBeInTheDocument()
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

  describe('new user dialog', () => {
    async function openDialog() {
      get.mockResolvedValue({ data: { users: [admin] } })
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: 'New user' }))
      return screen.findByRole('dialog')
    }

    it('is hidden until the new user button is clicked', async () => {
      get.mockResolvedValue({ data: { users: [admin] } })
      renderPage()

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'New user' }))

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByLabelText('Name')).toBeInTheDocument()
      expect(within(dialog).getByLabelText('Email')).toBeInTheDocument()
      expect(within(dialog).getByLabelText('Password')).toBeInTheDocument()
    })

    it('hides when Escape is pressed', async () => {
      const dialog = await openDialog()

      fireEvent.keyDown(dialog, { key: 'Escape' })

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('hides when clicking outside the dialog', async () => {
      await openDialog()
      const overlay = document.querySelector('[data-slot="dialog-overlay"]')!

      fireEvent.pointerDown(overlay)
      fireEvent.pointerUp(overlay)
      fireEvent.click(overlay)

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('stays open when clicking inside the dialog', async () => {
      const dialog = await openDialog()

      fireEvent.pointerDown(within(dialog).getByLabelText('Name'))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('edit user', () => {
    it('shows an edit button for every row', async () => {
      get.mockResolvedValue({ data: { users: [admin, agent] } })
      renderPage()

      expect(await screen.findByRole('button', { name: 'Edit Ada Admin' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit Sam Agent' })).toBeInTheDocument()
    })

    it('opens a dialog populated with that user and closes on Escape', async () => {
      get.mockResolvedValue({ data: { users: [admin, agent] } })
      renderPage()

      fireEvent.click(await screen.findByRole('button', { name: 'Edit Sam Agent' }))

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByLabelText('Name')).toHaveValue('Sam Agent')
      expect(within(dialog).getByLabelText('Email')).toHaveValue('sam@example.com')
      expect(within(dialog).getByLabelText('Password')).toHaveValue('')

      fireEvent.keyDown(dialog, { key: 'Escape' })
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('shows the data of whichever row is edited', async () => {
      get.mockResolvedValue({ data: { users: [admin, agent] } })
      renderPage()

      fireEvent.click(await screen.findByRole('button', { name: 'Edit Ada Admin' }))

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByLabelText('Email')).toHaveValue('ada@example.com')
    })
  })

  describe('delete user', () => {
    it('shows a delete button for agents but not for admins', async () => {
      get.mockResolvedValue({ data: { users: [admin, agent] } })
      renderPage()

      expect(await screen.findByRole('button', { name: 'Delete Sam Agent' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Delete Ada Admin' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit Ada Admin' })).toBeInTheDocument()
    })

    it('asks for confirmation before deleting', async () => {
      get.mockResolvedValue({ data: { users: [admin, agent] } })
      renderPage()

      fireEvent.click(await screen.findByRole('button', { name: 'Delete Sam Agent' }))

      expect(await screen.findByRole('dialog')).toHaveTextContent('Sam Agent')
      expect(vi.mocked(api.delete)).not.toHaveBeenCalled()
    })
  })
})
