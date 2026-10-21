import { screen, within } from '@testing-library/react'
import { AxiosError, type AxiosResponse } from 'axios'
import { TicketCategory, TicketStatus, type Ticket } from '@helpdesk/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { renderWithQuery } from '@/test/renderWithQuery'
import TicketsPage from './TicketsPage'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))

const get = vi.mocked(api.get)

const refund: Ticket = {
  id: 2,
  subject: 'Refund please',
  senderName: 'Jo Customer',
  senderEmail: 'jo@example.com',
  status: TicketStatus.OPEN,
  category: null,
  createdAt: '2026-05-06T10:00:00.000Z',
}
const resolved: Ticket = {
  id: 1,
  subject: 'Login problem',
  senderName: 'Pat Person',
  senderEmail: 'pat@example.com',
  status: TicketStatus.RESOLVED,
  category: TicketCategory.TECHNICAL_QUESTION,
  createdAt: '2026-03-04T10:00:00.000Z',
}

const renderPage = () => renderWithQuery(<TicketsPage />)

describe('TicketsPage', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('shows the heading and requests the tickets endpoint', async () => {
    get.mockResolvedValue({ data: { tickets: [refund] } })
    renderPage()

    expect(screen.getByRole('heading', { name: 'Tickets' })).toBeInTheDocument()
    await screen.findByText('Refund please')
    expect(get).toHaveBeenCalledWith('/tickets', expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('shows skeletons and a busy table while loading', () => {
    get.mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('renders one row per ticket with subject, sender, status and date', async () => {
    get.mockResolvedValue({ data: { tickets: [refund, resolved] } })
    renderPage()

    const refundRow = (await screen.findByText('Refund please')).closest('tr')!
    expect(within(refundRow).getByText('Jo Customer')).toBeInTheDocument()
    expect(within(refundRow).getByText('jo@example.com')).toBeInTheDocument()
    expect(within(refundRow).getByText('Open')).toBeInTheDocument()
    expect(within(refundRow).getByText(new Date(refund.createdAt).toLocaleDateString())).toBeInTheDocument()

    const resolvedRow = screen.getByText('Login problem').closest('tr')!
    expect(within(resolvedRow).getByText('Resolved')).toBeInTheDocument()
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'false')
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0)
  })

  it('shows an empty state when there are no tickets', async () => {
    get.mockResolvedValue({ data: { tickets: [] } })
    renderPage()

    expect(await screen.findByText('No tickets yet')).toBeInTheDocument()
  })

  it('shows an error and no table when loading fails', async () => {
    get.mockRejectedValue(
      new AxiosError('Request failed', '500', undefined, undefined, { status: 500 } as AxiosResponse),
    )
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load tickets')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
