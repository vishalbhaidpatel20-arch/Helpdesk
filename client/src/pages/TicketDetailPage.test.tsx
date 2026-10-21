import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type AxiosResponse } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AGENT_TICKET_STATUSES, TicketCategory, TicketStatus, type TicketAgent, type Ticket, type TicketReply } from '@helpdesk/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { categoryLabels, formatDateTime, statusLabels } from '@/lib/tickets'
import TicketDetailPage from './TicketDetailPage'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), patch: vi.fn(), post: vi.fn() } }))

const get = vi.mocked(api.get)
const patch = vi.mocked(api.patch)
const post = vi.mocked(api.post)

const alex: TicketAgent = { id: 'u1', name: 'Alex Agent' }
const sam: TicketAgent = { id: 'u2', name: 'Sam Support' }

const reply: TicketReply = {
  id: 1,
  body: 'We are on it\n<i>not html</i>',
  author: alex,
  createdAt: '2026-05-06T11:00:00.000Z',
}

const ticket: Ticket = {
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

function optionNames(select: HTMLElement) {
  return within(select)
    .getAllByRole('option')
    .map((option) => option.textContent)
}

function axiosError(status: number) {
  return new AxiosError('failed', String(status), undefined, undefined, { status } as AxiosResponse)
}

// The page loads the ticket and the agent list through the same mocked api.get
function mockApi(
  ticketResult: Promise<unknown> | { data: Ticket },
  repliesResult: () => Promise<unknown> | { data: { replies: TicketReply[] } } = () => ({ data: { replies: [] } }),
) {
  get.mockImplementation((url) => {
    if (url === '/tickets/agents') return Promise.resolve({ data: { agents: [alex, sam] } }) as never
    if (url === '/tickets/7/replies') return repliesResult() as never
    return ticketResult as never
  })
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
    post.mockReset()
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
    expect(screen.getByLabelText('Status')).toHaveValue(ticket.status)
    expect(screen.getByLabelText('Category')).toHaveValue(TicketCategory.REFUND_REQUEST)
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

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to update ticket')
    expect(screen.getByLabelText('Assigned to')).toHaveValue(alex.id)
  })

  it('lists every status and category with their labels', async () => {
    mockApi({ data: ticket })
    renderPage()
    const status = await screen.findByLabelText('Status')
    const category = screen.getByLabelText('Category')

    expect(optionNames(status)).toEqual(AGENT_TICKET_STATUSES.map((s) => statusLabels[s]))
    expect(optionNames(category)).toEqual(['Uncategorized', ...Object.values(TicketCategory).map((c) => categoryLabels[c])])
  })

  it('shows the system-only status of a ticket the AI is still processing, without letting agents pick it', async () => {
    mockApi({ data: { ...ticket, status: TicketStatus.PROCESSING } })
    renderPage()
    const status = await screen.findByLabelText('Status')

    expect(status).toHaveValue(TicketStatus.PROCESSING)
    expect(optionNames(status)).toEqual([statusLabels[TicketStatus.PROCESSING], ...AGENT_TICKET_STATUSES.map((s) => statusLabels[s])])
  })

  it('updates the status', async () => {
    mockApi({ data: ticket })
    patch.mockResolvedValue({ data: { ...ticket, status: TicketStatus.RESOLVED } })
    renderPage()

    fireEvent.change(await screen.findByLabelText('Status'), { target: { value: TicketStatus.RESOLVED } })

    await waitFor(() => expect(patch).toHaveBeenCalledWith('/tickets/7', { status: TicketStatus.RESOLVED }))
    await waitFor(() => expect(screen.getByLabelText('Status')).toHaveValue(TicketStatus.RESOLVED))
  })

  it('updates the category', async () => {
    mockApi({ data: { ...ticket, category: null } })
    patch.mockResolvedValue({ data: { ...ticket, category: TicketCategory.TECHNICAL_QUESTION } })
    renderPage()

    fireEvent.change(await screen.findByLabelText('Category'), {
      target: { value: TicketCategory.TECHNICAL_QUESTION },
    })

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/tickets/7', { category: TicketCategory.TECHNICAL_QUESTION }),
    )
    await waitFor(() => expect(screen.getByLabelText('Category')).toHaveValue(TicketCategory.TECHNICAL_QUESTION))
  })

  it('clears the category', async () => {
    mockApi({ data: ticket })
    patch.mockResolvedValue({ data: { ...ticket, category: null } })
    renderPage()

    fireEvent.change(await screen.findByLabelText('Category'), { target: { value: '' } })

    await waitFor(() => expect(patch).toHaveBeenCalledWith('/tickets/7', { category: null }))
    await waitFor(() => expect(screen.getByLabelText('Category')).toHaveValue(''))
  })

  it('shows an error and keeps the status when updating it fails', async () => {
    mockApi({ data: ticket })
    patch.mockRejectedValue(axiosError(500))
    renderPage()

    fireEvent.change(await screen.findByLabelText('Status'), { target: { value: TicketStatus.CLOSED } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to update ticket')
    expect(screen.getByLabelText('Status')).toHaveValue(ticket.status)
  })

  it('formats dates as M/D/YYYY, h:mm:ss AM/PM', () => {
    expect(formatDateTime('2026-05-07T15:30:45.000Z')).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} (AM|PM)$/)
  })

  it('selects Uncategorized when the ticket has no category', async () => {
    mockApi({ data: { ...ticket, category: null } })
    renderPage()
    expect(await screen.findByLabelText('Category')).toHaveValue('')
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

  it('shows the replies below the message, oldest first', async () => {
    const second: TicketReply = { ...reply, id: 2, body: 'Second reply', author: sam }
    mockApi({ data: ticket }, () => ({ data: { replies: [reply, second] } }))
    renderPage()

    const list = await screen.findByRole('list', { name: 'Replies' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent(alex.name)
    expect(items[0]).toHaveTextContent(formatDateTime(reply.createdAt))
    // Reply text is rendered as plain text, never as HTML
    expect(within(items[0]).getByText(/not html/)).toHaveTextContent('<i>not html</i>')
    expect(items[1]).toHaveTextContent('Second reply')
  })

  it('shows an empty state when there are no replies', async () => {
    mockApi({ data: ticket })
    renderPage()
    expect(await screen.findByText('No replies yet.')).toBeInTheDocument()
  })

  it('shows a loading state for the replies', async () => {
    mockApi({ data: ticket }, () => new Promise(() => {}))
    renderPage()
    await screen.findByRole('heading', { name: 'Replies' })
    expect(screen.queryByText('No replies yet.')).not.toBeInTheDocument()
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
  })

  it('shows an error when loading the replies fails', async () => {
    mockApi({ data: ticket }, () => Promise.reject(axiosError(500)))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load replies')
  })

  it('submits a reply, adds it to the thread and clears the form', async () => {
    mockApi({ data: ticket })
    post.mockResolvedValue({ data: reply })
    renderPage()

    const input = await screen.findByLabelText('Reply')
    fireEvent.change(input, { target: { value: '  We are on it  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

    await waitFor(() => expect(post).toHaveBeenCalledWith('/tickets/7/replies', { body: 'We are on it' }))
    const list = await screen.findByRole('list', { name: 'Replies' })
    expect(within(list).getByText(/We are on it/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Reply')).toHaveValue(''))
    expect(screen.queryByText('No replies yet.')).not.toBeInTheDocument()
  })

  it('keeps the send button disabled for an empty reply', async () => {
    mockApi({ data: ticket })
    renderPage()

    await screen.findByLabelText('Reply')
    expect(screen.getByRole('button', { name: 'Send reply' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Reply'), { target: { value: '   ' } })

    expect(screen.getByRole('button', { name: 'Send reply' })).toBeDisabled()
    expect(post).not.toHaveBeenCalled()
  })

  it('shows an error and keeps the text when sending fails', async () => {
    mockApi({ data: ticket })
    post.mockRejectedValue(axiosError(500))
    renderPage()

    fireEvent.change(await screen.findByLabelText('Reply'), { target: { value: 'Hello' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to send reply')
    expect(screen.getByLabelText('Reply')).toHaveValue('Hello')
  })
})
