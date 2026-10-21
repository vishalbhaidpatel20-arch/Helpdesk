import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type AxiosResponse } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router'
import { TicketCategory, TicketStatus, type TicketDetail } from '@helpdesk/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { categoryLabels, statusLabels } from '@/lib/tickets'
import TicketDetailPage from './TicketDetailPage'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))

const get = vi.mocked(api.get)

const ticket: TicketDetail = {
  id: 7,
  subject: 'Refund please',
  body: 'Line one\n<b>not html</b>',
  senderName: 'Jo Customer',
  senderEmail: 'jo@example.com',
  status: TicketStatus.OPEN,
  category: TicketCategory.REFUND_REQUEST,
  createdAt: '2026-05-06T10:00:00.000Z',
  updatedAt: '2026-05-06T10:00:00.000Z',
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/tickets/7']}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TicketDetailPage', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('shows a loading state', () => {
    get.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
  })

  it('shows the ticket details', async () => {
    get.mockResolvedValue({ data: ticket })
    renderPage()

    expect(await screen.findByRole('heading', { name: ticket.subject })).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/tickets/7', expect.anything())
    expect(screen.getByText(statusLabels[ticket.status])).toBeInTheDocument()
    expect(screen.getByText(categoryLabels[TicketCategory.REFUND_REQUEST])).toBeInTheDocument()
    expect(screen.getByText(/Jo Customer/)).toHaveTextContent('jo@example.com')
    expect(screen.getByText(new Date(ticket.createdAt).toLocaleString())).toBeInTheDocument()
    // The body is rendered as plain text, never as HTML
    expect(screen.getByText(/not html/)).toHaveTextContent('<b>not html</b>')
    expect(screen.getByRole('link', { name: /back to tickets/i })).toHaveAttribute('href', '/tickets')
  })

  it('shows Uncategorized when the ticket has no category', async () => {
    get.mockResolvedValue({ data: { ...ticket, category: null } })
    renderPage()
    expect(await screen.findByText('Uncategorized')).toBeInTheDocument()
  })

  it('shows not found for a 404', async () => {
    get.mockRejectedValue(new AxiosError('nope', '404', undefined, undefined, { status: 404 } as AxiosResponse))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Ticket not found')
  })

  it('shows an error when loading fails', async () => {
    get.mockRejectedValue(new AxiosError('boom', '500', undefined, undefined, { status: 500 } as AxiosResponse))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load ticket')
  })
})
