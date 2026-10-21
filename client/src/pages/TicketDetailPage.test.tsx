import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type AxiosResponse } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router'
import { TicketCategory, TicketStatus, type TicketAgent, type TicketDetail } from '@helpdesk/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { categoryLabels, formatDateTime, statusLabels } from '@/lib/tickets'
import TicketDetailPage from './TicketDetailPage'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), patch: vi.fn() } }))

const get = vi.mocked(api.get)
const patch = vi.mocked(api.patch)

const alex: TicketAgent = { id: 'u1', name: 'Alex Agent' }
const sam: TicketAgent = { id: 'u2', name: 'Sam Support' }

const ticket: TicketDetail = {
  id: 7,
  subject: 'Refund please',
  body: 'Line one\n<b>not html</b>',
  senderName: 'Jo Customer',
  senderEmail: 'jo@example.com',
  status: TicketStatus.OPEN,
  category: TicketCategory.REFUND_REQUEST,
  assignedTo: alex,
  createdAt: '2026-05-06T10:00:00.000Z',
  updatedAt: '2026-05-07T15:30:45.000Z',
}

function axiosError(status: number) {
  return new AxiosError('failed', String(status), undefined, undefined, { status } as AxiosResponse)
}

// The page loads the ticket and the agent list through the same mocked api.get
function mockApi(ticketResult: Promise<unknown> | { data: TicketDetail }) {
  get.mockImplementation((url) =>
    url === '/tickets/agents' ? Promise.resolve({ data: { agents: [alex, sam] } }) : (ticketResult as never),
  )
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
    patch.mockReset()
  })

  it('shows a loading state', () => {
    mockApi(new Promise(() => {}))
    renderPage()
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
  })

  it('shows the ticket details', async () => {
    mockApi({ data: ticket })
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Ticket #7' })).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/tickets/7', expect.anything())
    expect(screen.getByText(statusLabels[ticket.status])).toBeInTheDocument()
    expect(screen.getByText(categoryLabels[TicketCategory.REFUND_REQUEST])).toBeInTheDocument()
    expect(screen.getByText(/Jo Customer/)).toHaveTextContent('jo@example.com')
    expect(screen.getByLabelText('Assigned to')).toHaveValue(alex.id)
    expect(screen.getByText(formatDateTime(ticket.createdAt))).toBeInTheDocument()
    expect(screen.getByText(formatDateTime(ticket.updatedAt))).toBeInTheDocument()
    // The message sits in a card titled with the subject
    const card = screen.getByText(ticket.subject).closest('[data-slot="card"]') as HTMLElement
    // The body is rendered as plain text, never as HTML
    expect(within(card).getByText(/not html/)).toHaveTextContent('<b>not html</b>')
    expect(screen.getByRole('link', { name: /back to tickets/i })).toHaveAttribute('href', '/tickets')
  })

  it('selects Unassigned when no agent is assigned', async () => {
    mockApi({ data: { ...ticket, assignedTo: null } })
    renderPage()
    const select = await screen.findByLabelText('Assigned to')
    expect(select).toHaveValue('')
    expect(within(select).getByRole('option', { name: 'Unassigned' })).toBeInTheDocument()
  })

  it('lists the agents as options', async () => {
    mockApi({ data: ticket })
    renderPage()
    const select = await screen.findByLabelText('Assigned to')
    expect(await within(select).findByRole('option', { name: sam.name })).toHaveValue(sam.id)
  })

  it('assigns the ticket to the chosen agent', async () => {
    mockApi({ data: { ...ticket, assignedTo: null } })
    patch.mockResolvedValue({ data: { ...ticket, assignedTo: sam } })
    renderPage()
    const select = await screen.findByLabelText('Assigned to')
    await within(select).findByRole('option', { name: sam.name })

    fireEvent.change(select, { target: { value: sam.id } })

    await waitFor(() => expect(patch).toHaveBeenCalledWith('/tickets/7', { assignedToId: sam.id }))
    await waitFor(() => expect(screen.getByLabelText('Assigned to')).toHaveValue(sam.id))
  })

  it('unassigns the ticket', async () => {
    mockApi({ data: ticket })
    patch.mockResolvedValue({ data: { ...ticket, assignedTo: null } })
    renderPage()

    fireEvent.change(await screen.findByLabelText('Assigned to'), { target: { value: '' } })

    await waitFor(() => expect(patch).toHaveBeenCalledWith('/tickets/7', { assignedToId: null }))
    await waitFor(() => expect(screen.getByLabelText('Assigned to')).toHaveValue(''))
  })

  it('shows an error when assigning fails', async () => {
    mockApi({ data: ticket })
    patch.mockRejectedValue(axiosError(500))
    renderPage()
    const select = await screen.findByLabelText('Assigned to')
    await within(select).findByRole('option', { name: sam.name })

    fireEvent.change(select, { target: { value: sam.id } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to assign ticket')
    expect(screen.getByLabelText('Assigned to')).toHaveValue(alex.id)
  })

  it('formats dates as M/D/YYYY, h:mm:ss AM/PM', () => {
    expect(formatDateTime('2026-05-07T15:30:45.000Z')).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} (AM|PM)$/)
  })

  it('shows Uncategorized when the ticket has no category', async () => {
    mockApi({ data: { ...ticket, category: null } })
    renderPage()
    expect(await screen.findByText('Uncategorized')).toBeInTheDocument()
  })

  it('shows not found for a 404', async () => {
    mockApi(Promise.reject(axiosError(404)))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Ticket not found')
  })

  it('shows an error when loading fails', async () => {
    mockApi(Promise.reject(axiosError(500)))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load ticket')
  })
})
