import { fireEvent, screen, waitFor } from '@testing-library/react'
import { AxiosError, type AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { renderWithQuery } from '@/test/renderWithQuery'
import CreateUserDialog from './CreateUserDialog'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }))

const post = vi.mocked(api.post)

function openDialog() {
  renderWithQuery(<CreateUserDialog />)
  fireEvent.click(screen.getByRole('button', { name: 'New user' }))
  return screen.findByRole('dialog')
}

function fill(name: string, email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Create user' }))
}

describe('CreateUserDialog', () => {
  beforeEach(() => {
    post.mockReset()
  })

  it('is closed until the button is clicked', async () => {
    renderWithQuery(<CreateUserDialog />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'New user' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('rejects a short name and a short password without calling the API', async () => {
    await openDialog()
    fill('Al', 'al@example.com', 'short')
    expect(await screen.findByText('Name must be at least 3 characters')).toBeInTheDocument()
    expect(screen.getByText('Password must be exactly 8 characters')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it('rejects a password longer than 8 characters', async () => {
    await openDialog()
    fill('Alice', 'alice@example.com', 'password1')
    expect(await screen.findByText('Password must be exactly 8 characters')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it('rejects an invalid email', async () => {
    await openDialog()
    fill('Alice', 'not-an-email', 'password')
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it('creates the user and closes the dialog on success', async () => {
    post.mockResolvedValue({ data: { user: { id: '3' } } })
    await openDialog()
    fill('Alice', 'alice@example.com', 'password')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(post).toHaveBeenCalledWith('/users', {
      name: 'Alice',
      email: 'alice@example.com',
      password: 'password',
    })
  })

  it('shows the server error and keeps the dialog open on failure', async () => {
    post.mockRejectedValue(
      new AxiosError('Conflict', '409', undefined, undefined, {
        status: 409,
        data: { error: 'A user with this email already exists' },
      } as AxiosResponse),
    )
    await openDialog()
    fill('Alice', 'alice@example.com', 'password')
    expect(await screen.findByRole('alert')).toHaveTextContent('A user with this email already exists')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
