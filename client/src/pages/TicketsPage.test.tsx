import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type AxiosResponse } from 'axios'
import { MemoryRouter, useLocation } from 'react-router'
import { TicketCategory, TicketStatus, type Ticket, type TicketListResponse } from '@helpdesk/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { Role } from '@/lib/roles'
import TicketsPage from './TicketsPage'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))
const useSession = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth-client', () => ({ authClient: { useSession } }))

const get = vi.mocked(api.get)

const newest: Ticket = {
  id: 2,
  subject: 'Refund please',
  senderName: 'Jo Customer',
  senderEmail: 'jo@example.com',
  status: TicketStatus.OPEN,
  category: null,
  body: 'I want my money back.',
  assignedTo: null,
  createdAt: '2026-05-06T10:00:00.000Z',
  updatedAt: '2026-05-06T10:00:00.000Z',
}
const oldest: Ticket = {
  id: 1,
  subject: 'Login problem',
  senderName: 'Pat Person',
  senderEmail: 'pat@example.com',
  status: TicketStatus.RESOLVED,
  category: TicketCategory.TECHNICAL_QUESTION,
  body: 'I cannot log in.',
  assignedTo: null,
  createdAt: '2026-03-04T10:00:00.000Z',
  updatedAt: '2026-03-04T10:00:00.000Z',
}

function listResponse(tickets: Ticket[], overrides: Partial<TicketListResponse> = {}) {
  return { data: { tickets, total: tickets.length, page: 1, pageSize: 20, ...overrides } }
}

// Shows the router's current URL so tests can assert that the page writes its state to it
function LocationProbe() {
  const { pathname, search } = useLocation()
  return <output data-testid="location">{pathname + search}</output>
}

// The page reads its filters/sort/page from the URL, so it needs a router; the query client has no retries
function renderPage(url = '/tickets') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <TicketsPage />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// Query params currently in the URL
function urlParams() {
  const url = screen.getByTestId('location').textContent ?? ''
  return new URLSearchParams(url.split('?')[1] ?? '')
}

// Query params of the most recent GET /tickets request
function lastParams() {
  const config = get.mock.calls.at(-1)?.[1] as { params: Record<string, unknown> }
  return config.params
}

function subjectsInOrder() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent)
}

describe('TicketsPage', () => {
  beforeEach(() => {
    get.mockReset()
    useSession.mockReturnValue({ data: { user: { role: Role.ADMIN } } })
  })

  it('shows the heading and requests the tickets endpoint', async () => {
    get.mockResolvedValue(listResponse([newest]))
    renderPage()

    expect(screen.getByRole('heading', { name: 'Tickets' })).toBeInTheDocument()
    await screen.findByText('Refund please')
    expect(get).toHaveBeenCalledWith(
      '/tickets',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('shows skeletons and a busy table while loading', () => {
    get.mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('renders one row per ticket with subject, sender, status, category and date', async () => {
    get.mockResolvedValue(listResponse([newest, oldest]))
    renderPage()

    const newestRow = (await screen.findByText('Refund please')).closest('tr')!
    expect(within(newestRow).getByText('Jo Customer')).toBeInTheDocument()
    expect(within(newestRow).getByText('jo@example.com')).toBeInTheDocument()
    expect(within(newestRow).getByText('Open')).toBeInTheDocument()
    expect(within(newestRow).getByText('—')).toBeInTheDocument()
    expect(within(newestRow).getByText(new Date(newest.createdAt).toLocaleDateString())).toBeInTheDocument()

    const oldestRow = screen.getByText('Login problem').closest('tr')!
    expect(within(oldestRow).getByText('Resolved')).toBeInTheDocument()
    expect(within(oldestRow).getByText('Technical Question')).toBeInTheDocument()
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'false')
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0)
  })

  it('links each subject to its ticket detail page', async () => {
    get.mockResolvedValue(listResponse([newest, oldest]))
    renderPage()

    expect(await screen.findByRole('link', { name: newest.subject })).toHaveAttribute('href', `/tickets/${newest.id}`)
    expect(screen.getByRole('link', { name: oldest.subject })).toHaveAttribute('href', `/tickets/${oldest.id}`)
  })

  it('shows an empty state when there are no tickets', async () => {
    get.mockResolvedValue(listResponse([]))
    renderPage()

    expect(await screen.findByText('No tickets found')).toBeInTheDocument()
  })

  it('shows an error and no table when loading fails', async () => {
    get.mockRejectedValue(
      new AxiosError('Request failed', '500', undefined, undefined, { status: 500 } as AxiosResponse),
    )
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load tickets')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  describe('sorting', () => {
    it('asks for newest first by default and renders the rows in the order the API returns them', async () => {
      get.mockResolvedValue(listResponse([newest, oldest]))
      renderPage()

      await screen.findByText('Refund please')
      expect(lastParams()).toMatchObject({ sort: 'createdAt', order: 'desc', page: 1 })
      expect(subjectsInOrder()).toEqual(['Refund please', 'Login problem'])
      expect(screen.getByRole('columnheader', { name: /Received/ })).toHaveAttribute('aria-sort', 'descending')
    })

    it('flips to oldest first when the sorted column is clicked again', async () => {
      get.mockResolvedValue(listResponse([newest, oldest]))
      renderPage()
      await screen.findByText('Refund please')

      fireEvent.click(screen.getByRole('button', { name: /Received/ }))

      await waitFor(() => expect(lastParams()).toMatchObject({ sort: 'createdAt', order: 'asc' }))
      expect(screen.getByRole('columnheader', { name: /Received/ })).toHaveAttribute('aria-sort', 'ascending')
    })

    it('sorts a new column ascending first and goes back to page 1', async () => {
      get.mockResolvedValue(listResponse([newest], { total: 45, page: 2 }))
      renderPage('/tickets?page=2')
      await screen.findByText('Refund please')

      fireEvent.click(screen.getByRole('button', { name: /Subject/ }))

      await waitFor(() => expect(lastParams()).toMatchObject({ sort: 'subject', order: 'asc', page: 1 }))
      expect(screen.getByRole('columnheader', { name: /Subject/ })).toHaveAttribute('aria-sort', 'ascending')
      expect(screen.getByRole('columnheader', { name: /Received/ })).toHaveAttribute('aria-sort', 'none')
    })

    it('reads the sort from the URL', async () => {
      get.mockResolvedValue(listResponse([oldest, newest]))
      renderPage('/tickets?sort=status&order=desc')

      await screen.findByText('Login problem')
      expect(lastParams()).toMatchObject({ sort: 'status', order: 'desc' })
      expect(screen.getByRole('columnheader', { name: /Status/ })).toHaveAttribute('aria-sort', 'descending')
    })

    it('falls back to newest first when the URL has invalid values', async () => {
      get.mockResolvedValue(listResponse([newest]))
      renderPage('/tickets?sort=body&order=sideways&page=-3')

      await screen.findByText('Refund please')
      expect(lastParams()).toMatchObject({ sort: 'createdAt', order: 'desc', page: 1 })
    })
  })

  describe('sorting state', () => {
    it('sorts by subject ascending, then descending when clicked again, and writes it to the URL', async () => {
      get.mockResolvedValue(listResponse([newest, oldest]))
      renderPage()
      await screen.findByText('Refund please')

      fireEvent.click(screen.getByRole('button', { name: /Subject/ }))
      await waitFor(() => expect(urlParams().get('sort')).toBe('subject'))
      expect(urlParams().get('order')).toBe('asc')
      expect(screen.getByRole('columnheader', { name: /Subject/ })).toHaveAttribute('aria-sort', 'ascending')
      expect(screen.getByRole('columnheader', { name: /Received/ })).toHaveAttribute('aria-sort', 'none')

      fireEvent.click(screen.getByRole('button', { name: /Subject/ }))
      await waitFor(() => expect(urlParams().get('order')).toBe('desc'))
      expect(screen.getByRole('columnheader', { name: /Subject/ })).toHaveAttribute('aria-sort', 'descending')
    })

    it('never clears the sort: repeated clicks alternate ascending and descending', async () => {
      get.mockResolvedValue(listResponse([newest, oldest]))
      renderPage()
      await screen.findByText('Refund please')
      const subjectHeader = () => screen.getByRole('columnheader', { name: /Subject/ })

      for (const expected of ['ascending', 'descending', 'ascending']) {
        fireEvent.click(screen.getByRole('button', { name: /Subject/ }))
        await waitFor(() => expect(subjectHeader()).toHaveAttribute('aria-sort', expected))
      }
    })

    it('starts Received newest first when switching to it from another column', async () => {
      get.mockResolvedValue(listResponse([newest, oldest]))
      renderPage('/tickets?sort=subject&order=asc')
      await screen.findByText('Refund please')

      fireEvent.click(screen.getByRole('button', { name: /Received/ }))

      await waitFor(() => expect(urlParams().get('sort')).toBe('createdAt'))
      expect(urlParams().get('order')).toBe('desc')
    })

    it('has no sort button on the Sender and Category columns', async () => {
      get.mockResolvedValue(listResponse([newest]))
      renderPage()
      await screen.findByText('Refund please')

      expect(screen.queryByRole('button', { name: /Sender/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Category/ })).not.toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Sender' })).not.toHaveAttribute('aria-sort')
    })

    it('shows the rows in the order the server returned them without re-sorting them', async () => {
      // Oldest first although the sort says newest first: the table must not reorder rows itself
      get.mockResolvedValue(listResponse([oldest, newest]))
      renderPage()

      await screen.findByText('Login problem')
      expect(subjectsInOrder()).toEqual(['Login problem', 'Refund please'])
    })

    it('restores the sort from the URL, as after a reload', async () => {
      get.mockResolvedValue(listResponse([newest, oldest]))
      renderPage('/tickets?sort=subject&order=asc')

      await screen.findByText('Refund please')
      expect(screen.getByRole('columnheader', { name: /Subject/ })).toHaveAttribute('aria-sort', 'ascending')
      expect(screen.getByRole('columnheader', { name: /Received/ })).toHaveAttribute('aria-sort', 'none')
      expect(lastParams()).toMatchObject({ sort: 'subject', order: 'asc' })
    })
  })

  describe('filters', () => {
    // Pretends the API has no tickets for this filter value
    function emptyFor(filter: 'status' | 'category', value: string) {
      get.mockImplementation(async (_url, config) => {
        const params = (config as { params: Record<string, unknown> }).params
        return params[filter] === value ? listResponse([]) : listResponse([newest])
      })
    }

    it('writes the status filter to the URL and shows the empty state when nothing matches', async () => {
      emptyFor('status', TicketStatus.RESOLVED)
      renderPage()
      await screen.findByText('Refund please')

      fireEvent.change(screen.getByLabelText('Status'), { target: { value: TicketStatus.RESOLVED } })
      expect(await screen.findByText('No tickets found')).toBeInTheDocument()
      expect(urlParams().get('status')).toBe(TicketStatus.RESOLVED)
      expect(screen.queryByText('Refund please')).not.toBeInTheDocument()

      fireEvent.change(screen.getByLabelText('Status'), { target: { value: '' } })
      expect(await screen.findByText('Refund please')).toBeInTheDocument()
      expect(urlParams().has('status')).toBe(false)

      fireEvent.change(screen.getByLabelText('Status'), { target: { value: TicketStatus.OPEN } })
      await waitFor(() => expect(urlParams().get('status')).toBe(TicketStatus.OPEN))
      expect(await screen.findByText('Refund please')).toBeInTheDocument()
    })

    it('writes the category filter to the URL and shows the empty state when nothing matches', async () => {
      emptyFor('category', TicketCategory.REFUND_REQUEST)
      renderPage()
      await screen.findByText('Refund please')

      fireEvent.change(screen.getByLabelText('Category'), { target: { value: TicketCategory.REFUND_REQUEST } })

      expect(await screen.findByText('No tickets found')).toBeInTheDocument()
      expect(urlParams().get('category')).toBe(TicketCategory.REFUND_REQUEST)
    })

    it('restores both filters from the URL, as after a reload', async () => {
      get.mockResolvedValue(listResponse([newest]))
      renderPage('/tickets?status=RESOLVED&category=REFUND_REQUEST')

      await screen.findByText('Refund please')
      expect(screen.getByLabelText('Status')).toHaveValue(TicketStatus.RESOLVED)
      expect(screen.getByLabelText('Category')).toHaveValue(TicketCategory.REFUND_REQUEST)
      expect(lastParams()).toMatchObject({ status: 'RESOLVED', category: 'REFUND_REQUEST' })
    })

    it('starts with both filters on All and sends neither', async () => {
      get.mockResolvedValue(listResponse([newest]))
      renderPage()

      await screen.findByText('Refund please')
      expect(screen.getByLabelText('Status')).toHaveValue('')
      expect(screen.getByLabelText('Category')).toHaveValue('')
      expect(lastParams().status).toBeUndefined()
      expect(lastParams().category).toBeUndefined()
    })

    it('filters by status and goes back to page 1', async () => {
      get.mockResolvedValue(listResponse([newest], { total: 45, page: 2 }))
      renderPage('/tickets?page=2')
      await screen.findByText('Refund please')

      fireEvent.change(screen.getByLabelText('Status'), { target: { value: TicketStatus.RESOLVED } })

      await waitFor(() => expect(lastParams()).toMatchObject({ status: TicketStatus.RESOLVED, page: 1 }))
      expect(screen.getByLabelText('Status')).toHaveValue(TicketStatus.RESOLVED)
    })

    it('filters by category', async () => {
      get.mockResolvedValue(listResponse([oldest]))
      renderPage()
      await screen.findByText('Login problem')

      fireEvent.change(screen.getByLabelText('Category'), {
        target: { value: TicketCategory.REFUND_REQUEST },
      })

      await waitFor(() => expect(lastParams()).toMatchObject({ category: TicketCategory.REFUND_REQUEST }))
    })

    it('clears a filter when All is chosen again', async () => {
      get.mockResolvedValue(listResponse([newest]))
      renderPage('/tickets?status=OPEN')
      await screen.findByText('Refund please')
      expect(screen.getByLabelText('Status')).toHaveValue(TicketStatus.OPEN)

      fireEvent.change(screen.getByLabelText('Status'), { target: { value: '' } })

      await waitFor(() => expect(lastParams().status).toBeUndefined())
    })

    it('keeps sorting when a filter changes', async () => {
      get.mockResolvedValue(listResponse([newest]))
      renderPage('/tickets?sort=subject&order=asc')
      await screen.findByText('Refund please')

      fireEvent.change(screen.getByLabelText('Status'), { target: { value: TicketStatus.OPEN } })

      await waitFor(() => expect(lastParams()).toMatchObject({ status: TicketStatus.OPEN, sort: 'subject', order: 'asc' }))
    })
  })

  describe('search', () => {
    const searchBox = () => screen.getByRole('searchbox', { name: 'Search tickets' })

    it('starts empty and sends no search', async () => {
      get.mockResolvedValue(listResponse([newest]))
      renderPage()

      await screen.findByText('Refund please')
      expect(searchBox()).toHaveValue('')
      expect(lastParams().search).toBeUndefined()
    })

    it('searches after the user pauses typing, writes it to the URL and goes back to page 1', async () => {
      get.mockResolvedValue(listResponse([newest], { total: 45, page: 2 }))
      renderPage('/tickets?page=2')
      await screen.findByText('Refund please')

      fireEvent.change(searchBox(), { target: { value: 'refund' } })

      await waitFor(() => expect(lastParams()).toMatchObject({ search: 'refund', page: 1 }))
      expect(urlParams().get('search')).toBe('refund')
      expect(urlParams().get('page')).toBe('1')
    })

    it('does not call the API for every keystroke', async () => {
      get.mockResolvedValue(listResponse([newest]))
      renderPage()
      await screen.findByText('Refund please')
      const callsBefore = get.mock.calls.length

      for (const value of ['r', 're', 'ref', 'refu']) {
        fireEvent.change(searchBox(), { target: { value } })
      }

      await waitFor(() => expect(lastParams().search).toBe('refu'))
      const searched = get.mock.calls.slice(callsBefore).filter(([, config]) => (config as { params: { search?: string } }).params.search)
      expect(searched.map(([, config]) => (config as { params: { search: string } }).params.search)).toEqual(['refu'])
    })

    it('shows the empty state when nothing matches', async () => {
      get.mockImplementation(async (_url, config) => {
        const { search } = (config as { params: { search?: string } }).params
        return search === 'zzz' ? listResponse([]) : listResponse([newest])
      })
      renderPage()
      await screen.findByText('Refund please')

      fireEvent.change(searchBox(), { target: { value: 'zzz' } })

      expect(await screen.findByText('No tickets found')).toBeInTheDocument()
    })

    it('trims the search and treats blank text as no search', async () => {
      get.mockResolvedValue(listResponse([newest]))
      renderPage()
      await screen.findByText('Refund please')

      fireEvent.change(searchBox(), { target: { value: '  jo  ' } })
      await waitFor(() => expect(lastParams().search).toBe('jo'))

      fireEvent.change(searchBox(), { target: { value: '   ' } })
      await waitFor(() => expect(lastParams().search).toBeUndefined())
      expect(urlParams().has('search')).toBe(false)
    })

    it('clears the search from the URL when the box is emptied', async () => {
      get.mockResolvedValue(listResponse([newest]))
      renderPage('/tickets?search=refund')
      await screen.findByText('Refund please')

      fireEvent.change(searchBox(), { target: { value: '' } })

      await waitFor(() => expect(urlParams().has('search')).toBe(false))
      expect(lastParams().search).toBeUndefined()
    })

    it('restores the search from the URL, as after a reload', async () => {
      get.mockResolvedValue(listResponse([newest]))
      renderPage('/tickets?search=refund')

      await screen.findByText('Refund please')
      expect(searchBox()).toHaveValue('refund')
      expect(lastParams()).toMatchObject({ search: 'refund' })
    })

    it('keeps the status filter and sort while searching', async () => {
      get.mockResolvedValue(listResponse([newest]))
      renderPage('/tickets?status=OPEN&sort=subject&order=asc')
      await screen.findByText('Refund please')

      fireEvent.change(searchBox(), { target: { value: 'refund' } })

      await waitFor(() =>
        expect(lastParams()).toMatchObject({ search: 'refund', status: 'OPEN', sort: 'subject', order: 'asc' }),
      )
    })

    it('keeps a trailing space while the user is still typing a longer phrase', async () => {
      get.mockResolvedValue(listResponse([newest]))
      renderPage()
      await screen.findByText('Refund please')

      fireEvent.change(searchBox(), { target: { value: 'login ' } })
      await waitFor(() => expect(lastParams().search).toBe('login'))

      expect(searchBox()).toHaveValue('login ')
    })
  })

  describe('pagination', () => {
    it('shows the total and the current page', async () => {
      get.mockResolvedValue(listResponse([newest], { total: 45 }))
      renderPage()

      expect(await screen.findByText('45 tickets')).toBeInTheDocument()
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    })

    it('disables Previous on the first page and goes forward with Next', async () => {
      get.mockResolvedValue(listResponse([newest], { total: 45 }))
      renderPage()
      await screen.findByText('Page 1 of 3')

      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
      fireEvent.click(screen.getByRole('button', { name: 'Next' }))

      await waitFor(() => expect(lastParams()).toMatchObject({ page: 2 }))
    })

    it('goes back with Previous and disables Next on the last page', async () => {
      get.mockResolvedValue(listResponse([oldest], { total: 45, page: 3 }))
      renderPage('/tickets?page=3')
      await screen.findByText('Page 3 of 3')

      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
      fireEvent.click(screen.getByRole('button', { name: 'Previous' }))

      await waitFor(() => expect(lastParams()).toMatchObject({ page: 2 }))
    })

    it('writes the page to the URL when moving between pages', async () => {
      get.mockImplementation(async (_url, config) => {
        const { page } = (config as { params: { page: number } }).params
        return listResponse([page === 1 ? newest : oldest], { total: 45, page })
      })
      renderPage()
      await screen.findByText('Page 1 of 3')
      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

      fireEvent.click(screen.getByRole('button', { name: 'Next' }))
      expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument()
      expect(urlParams().get('page')).toBe('2')
      expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
      expect(await screen.findByText('Login problem')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
      expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument()
      expect(urlParams().get('page')).toBe('1')
    })

    it('opens the last page straight from the URL with Next disabled', async () => {
      get.mockResolvedValue(listResponse([oldest], { total: 45, page: 3 }))
      renderPage('/tickets?page=3')

      expect(await screen.findByText('Page 3 of 3')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
    })

    it('shows a single page for a short list', async () => {
      get.mockResolvedValue(listResponse([newest]))
      renderPage()

      expect(await screen.findByText('1 ticket')).toBeInTheDocument()
      expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    })
  })

  describe('assignee filter', () => {
    it('shows an agent only their own tickets by default', async () => {
      useSession.mockReturnValue({ data: { user: { role: Role.AGENT } } })
      get.mockResolvedValue(listResponse([newest]))
      renderPage()

      await screen.findByText('Refund please')
      expect(lastParams()).toMatchObject({ assignee: 'me' })
      expect(screen.getByLabelText('Show')).toHaveValue('me')
    })

    it('lets an agent switch to all tickets, which is kept in the URL', async () => {
      useSession.mockReturnValue({ data: { user: { role: Role.AGENT } } })
      get.mockResolvedValue(listResponse([newest]))
      renderPage()
      await screen.findByText('Refund please')

      fireEvent.change(screen.getByLabelText('Show'), { target: { value: 'all' } })

      await waitFor(() => expect(lastParams()).toMatchObject({ assignee: 'all', page: 1 }))
      expect(urlParams().get('assignee')).toBe('all')
    })

    it('shows an admin every ticket by default', async () => {
      get.mockResolvedValue(listResponse([newest]))
      renderPage()

      await screen.findByText('Refund please')
      expect(lastParams()).toMatchObject({ assignee: 'all' })
      expect(screen.getByLabelText('Show')).toHaveValue('all')
    })
  })
})
