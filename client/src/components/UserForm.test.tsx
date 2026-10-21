import { fireEvent, screen, waitFor } from '@testing-library/react'
import { AxiosError, type AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { Role } from '@/lib/roles'
import { renderWithQuery } from '@/test/renderWithQuery'
import UserForm from './UserForm'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))

const post = vi.mocked(api.post)
const patch = vi.mocked(api.patch)
const onSuccess = vi.fn()

function renderForm() {
  return renderWithQuery(<UserForm onSuccess={onSuccess} />)
}

function fill({ name = 'Alice', email = 'alice@example.com', password = 'password' } = {}) {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: /create user|creating/i }))
}

function httpError(status: number, data?: unknown) {
  return new AxiosError('Request failed', String(status), undefined, undefined, {
    status,
    data,
  } as AxiosResponse)
}

describe('UserForm', () => {
  beforeEach(() => {
    post.mockReset()
    patch.mockReset()
    onSuccess.mockReset()
  })

  it('renders empty name, email and password fields and a submit button', () => {
    renderForm()

    expect(screen.getByLabelText('Name')).toHaveValue('')
    expect(screen.getByLabelText('Email')).toHaveValue('')
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Create user' })).toBeEnabled()
  })

  describe('validation', () => {
    it('requires every field when submitted empty', async () => {
      renderForm()
      submit()

      expect(await screen.findByText('Name must be at least 3 characters')).toBeInTheDocument()
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('Password must be exactly 8 characters')).toBeInTheDocument()
      expect(post).not.toHaveBeenCalled()
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('rejects a name shorter than 3 characters', async () => {
      renderForm()
      fill({ name: 'Al' })
      submit()

      expect(await screen.findByText('Name must be at least 3 characters')).toBeInTheDocument()
      expect(post).not.toHaveBeenCalled()
    })

    it('counts a name of only spaces as too short', async () => {
      renderForm()
      fill({ name: '     ' })
      submit()

      expect(await screen.findByText('Name must be at least 3 characters')).toBeInTheDocument()
      expect(post).not.toHaveBeenCalled()
    })

    it('rejects an invalid email', async () => {
      renderForm()
      fill({ email: 'not-an-email' })
      submit()

      expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
      expect(post).not.toHaveBeenCalled()
    })

    it.each([['short', 'too short'], ['password1', 'too long']])(
      'rejects a password that is %s (%s)',
      async (password) => {
        renderForm()
        fill({ password })
        submit()

        expect(await screen.findByText('Password must be exactly 8 characters')).toBeInTheDocument()
        expect(post).not.toHaveBeenCalled()
      },
    )

    it('marks invalid fields with aria-invalid and leaves valid ones alone', async () => {
      renderForm()
      fill({ name: 'Al' })
      submit()

      await screen.findByText('Name must be at least 3 characters')
      expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'false')
    })
  })

  describe('submitting', () => {
    it('posts the values and calls onSuccess', async () => {
      post.mockResolvedValue({ data: { user: { id: '3' } } })
      renderForm()
      fill()
      submit()

      await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
      expect(post).toHaveBeenCalledWith('/users', {
        name: 'Alice',
        email: 'alice@example.com',
        password: 'password',
      })
    })

    it('trims the name and normalizes the email before posting', async () => {
      post.mockResolvedValue({ data: { user: { id: '3' } } })
      renderForm()
      fill({ name: '  Alice  ', email: ' Alice@Example.COM ' })
      submit()

      await waitFor(() => expect(onSuccess).toHaveBeenCalled())
      expect(post).toHaveBeenCalledWith('/users', {
        name: 'Alice',
        email: 'alice@example.com',
        password: 'password',
      })
    })

    it('disables the button and shows a pending label while the request is in flight', async () => {
      post.mockReturnValue(new Promise(() => {}))
      renderForm()
      fill()
      submit()

      const button = await screen.findByRole('button', { name: 'Creating...' })
      expect(button).toBeDisabled()
      expect(onSuccess).not.toHaveBeenCalled()
    })
  })

  describe('on error', () => {
    it('shows the error message returned by the server', async () => {
      post.mockRejectedValue(httpError(409, { error: 'A user with this email already exists' }))
      renderForm()
      fill()
      submit()

      expect(await screen.findByRole('alert')).toHaveTextContent('A user with this email already exists')
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('shows a generic message when the response has no error text', async () => {
      post.mockRejectedValue(httpError(500))
      renderForm()
      fill()
      submit()

      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to create user')
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('shows a generic message for a network failure', async () => {
      post.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
      renderForm()
      fill()
      submit()

      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to create user')
    })

    it('keeps the entered values and re-enables the button so the user can retry', async () => {
      post.mockRejectedValue(httpError(500))
      renderForm()
      fill()
      submit()

      await screen.findByRole('alert')
      expect(screen.getByLabelText('Name')).toHaveValue('Alice')
      expect(screen.getByLabelText('Email')).toHaveValue('alice@example.com')
      expect(screen.getByRole('button', { name: 'Create user' })).toBeEnabled()
    })
  })

  describe('editing an existing user', () => {
    const user = {
      id: 'u1',
      name: 'Sam Agent',
      email: 'sam@example.com',
      role: Role.AGENT,
      createdAt: '2026-05-06T10:00:00.000Z',
    }

    function renderEditForm() {
      return renderWithQuery(<UserForm user={user} onSuccess={onSuccess} />)
    }

    it('populates name and email from the user and leaves the password empty', () => {
      renderEditForm()

      expect(screen.getByLabelText('Name')).toHaveValue('Sam Agent')
      expect(screen.getByLabelText('Email')).toHaveValue('sam@example.com')
      expect(screen.getByLabelText('Password')).toHaveValue('')
      expect(screen.getByText('Leave blank to keep the current password.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
    })

    it('saves without a password when it is left blank', async () => {
      patch.mockResolvedValue({ data: { user } })
      renderEditForm()
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Samuel Agent' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
      expect(patch).toHaveBeenCalledTimes(1)
      const [url, body] = patch.mock.calls[0] as [string, { name: string; email: string; password?: string }]
      expect(url).toBe('/users/u1')
      expect(body).toMatchObject({ name: 'Samuel Agent', email: 'sam@example.com' })
      expect(body.password ?? '').toBe('')
      expect(post).not.toHaveBeenCalled()
    })

    it('sends the new password when one is provided', async () => {
      patch.mockResolvedValue({ data: { user } })
      renderEditForm()
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'newpass1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => expect(onSuccess).toHaveBeenCalled())
      expect(patch).toHaveBeenCalledWith('/users/u1', {
        name: 'Sam Agent',
        email: 'sam@example.com',
        password: 'newpass1',
      })
    })

    it('rejects a provided password that is not 8 characters', async () => {
      renderEditForm()
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      expect(await screen.findByText('Password must be exactly 8 characters')).toBeInTheDocument()
      expect(patch).not.toHaveBeenCalled()
    })

    it('still validates the name and email', async () => {
      renderEditForm()
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Al' } })
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nope' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      expect(await screen.findByText('Name must be at least 3 characters')).toBeInTheDocument()
      expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
      expect(patch).not.toHaveBeenCalled()
    })

    it('shows the server error and does not call onSuccess', async () => {
      patch.mockRejectedValue(httpError(409, { error: 'A user with this email already exists' }))
      renderEditForm()
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('A user with this email already exists')
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('shows a generic message when the update fails without details', async () => {
      patch.mockRejectedValue(httpError(500))
      renderEditForm()
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to update user')
    })
  })
})
