import { fireEvent, screen, waitFor } from '@testing-library/react'
import { AxiosError, type AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { Role } from '@/lib/roles'
import { renderWithQuery } from '@/test/renderWithQuery'
import DeleteUserDialog from './DeleteUserDialog'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), delete: vi.fn() } }))

const del = vi.mocked(api.delete)

const user = {
  id: 'u1',
  name: 'Sam Agent',
  email: 'sam@example.com',
  role: Role.AGENT,
  createdAt: '2026-05-06T10:00:00.000Z',
}

async function openDialog() {
  renderWithQuery(<DeleteUserDialog user={user} />)
  fireEvent.click(screen.getByRole('button', { name: 'Delete Sam Agent' }))
  return screen.findByRole('dialog')
}

describe('DeleteUserDialog', () => {
  beforeEach(() => {
    del.mockReset()
  })

  it('asks for confirmation naming the user without deleting yet', async () => {
    const dialog = await openDialog()

    expect(dialog).toHaveTextContent('Sam Agent')
    expect(dialog).toHaveTextContent('sam@example.com')
    expect(del).not.toHaveBeenCalled()
  })

  it('does not delete and closes when cancelled', async () => {
    await openDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(del).not.toHaveBeenCalled()
  })

  it('deletes the user and closes when confirmed', async () => {
    del.mockResolvedValue({})
    await openDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(del).toHaveBeenCalledWith('/users/u1')
  })

  it('disables the confirm button while the request is in flight', async () => {
    del.mockReturnValue(new Promise(() => {}))
    await openDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('button', { name: 'Deleting...' })).toBeDisabled()
  })

  it('shows the server error and stays open when deletion fails', async () => {
    del.mockRejectedValue(
      new AxiosError('Forbidden', '403', undefined, undefined, {
        status: 403,
        data: { error: 'Admins cannot be deleted' },
      } as AxiosResponse),
    )
    await openDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Admins cannot be deleted')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows a generic message when the failure has no details', async () => {
    del.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    await openDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to delete user')
  })
})
