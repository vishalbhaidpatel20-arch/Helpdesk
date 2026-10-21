import { fireEvent, screen, waitFor } from '@testing-library/react'
import { AxiosError, type AxiosResponse } from 'axios'
import { MAX_REPLY_LENGTH, type TicketReply } from '@helpdesk/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { renderWithQuery } from '@/test/renderWithQuery'
import ReplyForm from './ReplyForm'

vi.mock('@/lib/api', () => ({ api: { post: vi.fn() } }))

const post = vi.mocked(api.post)

const saved: TicketReply = {
  id: 1,
  body: 'Hello',
  author: { id: 'u1', name: 'Alex Agent' },
  createdAt: '2026-05-06T11:00:00.000Z',
}

function httpError(status: number, error?: string) {
  return new AxiosError('failed', String(status), undefined, undefined, {
    status,
    data: error ? { error } : undefined,
  } as AxiosResponse)
}

function type(text: string) {
  fireEvent.change(screen.getByLabelText('Reply'), { target: { value: text } })
}

function send() {
  fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))
}

describe('ReplyForm', () => {
  beforeEach(() => {
    post.mockReset()
  })

  it('renders an empty textarea and a send button', () => {
    renderWithQuery(<ReplyForm ticketId="7" />)
    expect(screen.getByLabelText('Reply')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Send reply' })).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('posts the trimmed reply to the ticket and clears the form', async () => {
    post.mockResolvedValue({ data: saved })
    renderWithQuery(<ReplyForm ticketId="7" />)

    type('  Hello  ')
    send()

    await waitFor(() => expect(post).toHaveBeenCalledWith('/tickets/7/replies', { body: 'Hello' }))
    await waitFor(() => expect(screen.getByLabelText('Reply')).toHaveValue(''))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('disables the button and shows progress while sending', async () => {
    post.mockReturnValue(new Promise(() => {}))
    renderWithQuery(<ReplyForm ticketId="7" />)

    type('Hello')
    send()

    const button = await screen.findByRole('button', { name: 'Sending...' })
    expect(button).toBeDisabled()
  })

  it.each([
    ['empty', ''],
    ['whitespace-only', '   \n  '],
  ])('shows a validation error and does not post a %s reply', async (_name, text) => {
    renderWithQuery(<ReplyForm ticketId="7" />)

    type(text)
    send()

    expect(await screen.findByText('Reply is required')).toBeInTheDocument()
    expect(screen.getByLabelText('Reply')).toBeInvalid()
    expect(post).not.toHaveBeenCalled()
  })

  it('rejects a reply over the length limit', async () => {
    renderWithQuery(<ReplyForm ticketId="7" />)

    type('a'.repeat(MAX_REPLY_LENGTH + 1))
    send()

    expect(await screen.findByText(`Reply must be at most ${MAX_REPLY_LENGTH} characters`)).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it('shows the server error message and keeps the text when sending fails', async () => {
    post.mockRejectedValue(httpError(404, 'Ticket not found'))
    renderWithQuery(<ReplyForm ticketId="7" />)

    type('Hello')
    send()

    expect(await screen.findByRole('alert')).toHaveTextContent('Ticket not found')
    expect(screen.getByLabelText('Reply')).toHaveValue('Hello')
    expect(screen.getByRole('button', { name: 'Send reply' })).toBeEnabled()
  })

  it('shows a generic error when the failure has no message', async () => {
    post.mockRejectedValue(httpError(500))
    renderWithQuery(<ReplyForm ticketId="7" />)

    type('Hello')
    send()

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to send reply')
    expect(screen.getByLabelText('Reply')).toHaveValue('Hello')
  })

  it('can resend after a failure', async () => {
    post.mockRejectedValueOnce(httpError(500)).mockResolvedValueOnce({ data: saved })
    renderWithQuery(<ReplyForm ticketId="7" />)

    type('Hello')
    send()
    await screen.findByRole('alert')

    send()

    await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByLabelText('Reply')).toHaveValue(''))
  })
})
