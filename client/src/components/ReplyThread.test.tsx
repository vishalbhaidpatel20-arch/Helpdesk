import { screen, within } from '@testing-library/react'
import { AxiosError, type AxiosResponse } from 'axios'
import type { TicketReply } from '@helpdesk/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/tickets'
import { renderWithQuery } from '@/test/renderWithQuery'
import ReplyThread from './ReplyThread'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))

const get = vi.mocked(api.get)

const first: TicketReply = {
  id: 1,
  body: 'Have you tried resetting your password?',
  author: { id: 'u1', name: 'Alex Agent' },
  createdAt: '2026-05-06T11:00:00.000Z',
}
const second: TicketReply = {
  id: 2,
  body: 'That worked,\nthanks!',
  author: { id: 'u2', name: 'Sam Support' },
  createdAt: '2026-05-06T12:00:00.000Z',
}

describe('ReplyThread', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('shows a skeleton while loading', () => {
    get.mockReturnValue(new Promise(() => {}))
    const { container } = renderWithQuery(<ReplyThread ticketId="7" />)
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
  })

  it('requests the replies of the ticket', async () => {
    get.mockResolvedValue({ data: { replies: [] } })
    renderWithQuery(<ReplyThread ticketId="7" />)
    await screen.findByText('No replies yet.')
    expect(get).toHaveBeenCalledWith('/tickets/7/replies', expect.objectContaining({ signal: expect.anything() }))
  })

  it('shows an empty message when there are no replies', async () => {
    get.mockResolvedValue({ data: { replies: [] } })
    renderWithQuery(<ReplyThread ticketId="7" />)
    expect(await screen.findByText('No replies yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('lists each reply with its author, date and text in the order returned', async () => {
    get.mockResolvedValue({ data: { replies: [first, second] } })
    renderWithQuery(<ReplyThread ticketId="7" />)

    const items = within(await screen.findByRole('list', { name: 'Replies' })).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent(`Alex Agent · ${formatDateTime(first.createdAt)}`)
    expect(items[0]).toHaveTextContent(first.body)
    expect(items[1]).toHaveTextContent(`Sam Support · ${formatDateTime(second.createdAt)}`)
    expect(items[1]).toHaveTextContent(/That worked,\s+thanks!/)
  })

  it('renders reply text as plain text, not HTML', async () => {
    const html = '<b>bold</b><img src=x onerror=alert(1)>'
    get.mockResolvedValue({ data: { replies: [{ ...first, body: html }] } })
    const { container } = renderWithQuery(<ReplyThread ticketId="7" />)
    expect(await screen.findByText(html)).toBeInTheDocument()
    expect(container.querySelector('b, img')).toBeNull()
  })

  it('shows an error when the replies fail to load', async () => {
    get.mockRejectedValue(new AxiosError('failed', '500', undefined, undefined, { status: 500 } as AxiosResponse))
    renderWithQuery(<ReplyThread ticketId="7" />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load replies')
  })

  it('does not request replies without a ticket id', () => {
    renderWithQuery(<ReplyThread ticketId={undefined} />)
    expect(get).not.toHaveBeenCalled()
  })
})
