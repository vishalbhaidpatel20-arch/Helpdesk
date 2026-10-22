import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { AxiosError, type AxiosResponse } from 'axios'
import type { TicketStats } from '@helpdesk/core'
import { MemoryRouter } from 'react-router'
import { Role } from '@/lib/roles'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { formatDuration } from '@/lib/tickets'
import { renderWithQuery } from '@/test/renderWithQuery'
import DashboardPage from './DashboardPage'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))

const get = vi.mocked(api.get)
const useSession = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth-client', () => ({ authClient: { useSession } }))

function mockApi(statsResult: Promise<unknown> | unknown) {
  get.mockImplementation(() => Promise.resolve(statsResult) as Promise<never>)
}

const stats: TicketStats = {
  total: 1200,
  open: 45,
  resolvedByAi: 300,
  resolvedByAiPercent: 25,
  averageResolutionSeconds: 93_784,
  ticketsPerDay: Array.from({ length: 30 }, (_, i) => ({ date: new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10), count: i })),
}

// The value shown in the card with the given label (the label is its first paragraph, the value its second)
function valueOf(label: string) {
  const card = screen.getByText(label).closest('[data-slot="card"]') as HTMLElement
  return within(card).getAllByText(/\S/, { selector: 'p' })[1]!
}

describe('DashboardPage', () => {
  beforeEach(() => {
    get.mockReset()
    useSession.mockReturnValue({ data: { user: { role: Role.ADMIN } } })
  })

  it('shows skeletons while loading', () => {
    get.mockReturnValue(new Promise(() => {}))
    const { container } = renderWithQuery(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(6)
  })

  it('requests the stats', async () => {
    mockApi({ data: stats })
    renderWithQuery(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    await screen.findByText('1,200')
    expect(get).toHaveBeenCalledWith('/stats', expect.objectContaining({ params: { assignee: 'all' }, signal: expect.anything() }))
  })

  it('shows the five statistics', async () => {
    mockApi({ data: stats })
    renderWithQuery(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )
    await screen.findByText('1,200')

    expect(valueOf('Total tickets')).toHaveTextContent('1,200')
    expect(valueOf('Open tickets')).toHaveTextContent('45')
    expect(valueOf('Resolved by AI')).toHaveTextContent('300')
    expect(valueOf('Resolved by AI (%)')).toHaveTextContent('25%')
    expect(valueOf('Average resolution time')).toHaveTextContent(formatDuration(stats.averageResolutionSeconds!))
  })

  it('shows the tickets-per-day chart below the statistics', async () => {
    mockApi({ data: stats })
    renderWithQuery(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    const chart = await screen.findByRole('img', { name: /tickets created per day/i })
    const section = screen.getByRole('region', { name: 'Ticket statistics' })
    expect(section.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows a dash for the average when no ticket has been resolved', async () => {
    mockApi({ data: { ...stats, resolvedByAi: 0, resolvedByAiPercent: 0, averageResolutionSeconds: null } })
    renderWithQuery(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )
    await screen.findByText('1,200')

    expect(valueOf('Average resolution time')).toHaveTextContent('—')
    expect(valueOf('Resolved by AI (%)')).toHaveTextContent('0%')
  })

  it('shows an error when the stats cannot be loaded', async () => {
    get.mockRejectedValue(new AxiosError('boom', undefined, undefined, undefined, { status: 500 } as AxiosResponse))
    renderWithQuery(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Failed to load the dashboard')).toBeInTheDocument()
  })
})

describe('formatDuration', () => {
  it.each([
    [0, '0s'],
    [35, '35s'],
    [3_720, '1h 2m'],
    [93_784, '1d 2h'],
    [86_400, '1d'],
    [59.6, '1m'],
  ])('formats %p seconds as %p', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected)
  })

  describe('assignee filter', () => {
    it('shows an agent the numbers for their own tickets by default', async () => {
      useSession.mockReturnValue({ data: { user: { role: Role.AGENT } } })
      mockApi({ data: stats })
      renderWithQuery(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>,
      )

      await screen.findByText('1,200')
      expect(get).toHaveBeenCalledWith('/stats', expect.objectContaining({ params: { assignee: 'me' } }))
      expect(screen.getByLabelText('Show')).toHaveValue('me')
    })

    it('reloads the numbers when the selection changes', async () => {
      useSession.mockReturnValue({ data: { user: { role: Role.AGENT } } })
      mockApi({ data: stats })
      renderWithQuery(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>,
      )
      await screen.findByText('1,200')

      fireEvent.change(screen.getByLabelText('Show'), { target: { value: 'all' } })

      await waitFor(() => expect(get).toHaveBeenLastCalledWith('/stats', expect.objectContaining({ params: { assignee: 'all' } })))
    })
  })
})
