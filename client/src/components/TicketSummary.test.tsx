import { fireEvent, screen, waitFor } from '@testing-library/react'
import { AxiosError, type AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { renderWithQuery } from '@/test/renderWithQuery'
import TicketSummary from './TicketSummary'

vi.mock('@/lib/api', () => ({ api: { post: vi.fn() } }))

const post = vi.mocked(api.post)

function httpError(status: number, error?: string) {
  return new AxiosError('failed', String(status), undefined, undefined, {
    status,
    data: error ? { error } : undefined,
  } as AxiosResponse)
}

function summarize() {
  fireEvent.click(screen.getByRole('button', { name: 'Summarize' }))
}

describe('TicketSummary', () => {
  beforeEach(() => {
    post.mockReset()
  })

  it('renders a summarize button with an icon and no summary yet', () => {
    const { container } = renderWithQuery(<TicketSummary ticketId="7" />)

    expect(screen.getByRole('button', { name: 'Summarize' })).toBeEnabled()
    expect(container.querySelector('button svg')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it('requests the summary for the ticket and shows it', async () => {
    post.mockResolvedValue({ data: { summary: 'Customer wants a refund.' } })
    renderWithQuery(<TicketSummary ticketId="7" />)

    summarize()

    expect(await screen.findByText('Customer wants a refund.')).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith('/tickets/7/summary')
  })

  it('shows progress and disables the button while summarizing', async () => {
    post.mockReturnValue(new Promise(() => {}))
    renderWithQuery(<TicketSummary ticketId="7" />)

    summarize()

    expect(await screen.findByRole('button', { name: 'Summarizing...' })).toBeDisabled()
  })

  it('regenerates the summary on every click', async () => {
    post
      .mockResolvedValueOnce({ data: { summary: 'First summary' } })
      .mockResolvedValueOnce({ data: { summary: 'Second summary' } })
    renderWithQuery(<TicketSummary ticketId="7" />)

    summarize()
    expect(await screen.findByText('First summary')).toBeInTheDocument()

    summarize()
    expect(await screen.findByText('Second summary')).toBeInTheDocument()
    expect(screen.queryByText('First summary')).not.toBeInTheDocument()
    expect(post).toHaveBeenCalledTimes(2)
  })

  it('renders the summary as plain text, not HTML', async () => {
    post.mockResolvedValue({ data: { summary: 'Click <b>here</b>' } })
    renderWithQuery(<TicketSummary ticketId="7" />)

    summarize()

    expect(await screen.findByText('Click <b>here</b>')).toBeInTheDocument()
  })

  it('shows the server error message when summarizing fails', async () => {
    post.mockRejectedValue(httpError(503, 'AI summaries are not configured'))
    renderWithQuery(<TicketSummary ticketId="7" />)

    summarize()

    expect(await screen.findByRole('alert')).toHaveTextContent('AI summaries are not configured')
    expect(screen.getByRole('button', { name: 'Summarize' })).toBeEnabled()
  })

  it('shows a generic error when the failure has no message', async () => {
    post.mockRejectedValue(httpError(500))
    renderWithQuery(<TicketSummary ticketId="7" />)

    summarize()

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to summarize ticket')
  })

  it('hides the error when a retry succeeds', async () => {
    post.mockRejectedValueOnce(httpError(502, 'AI summaries are unavailable right now. Try again later.'))
    post.mockResolvedValueOnce({ data: { summary: 'Recovered' } })
    renderWithQuery(<TicketSummary ticketId="7" />)

    summarize()
    await screen.findByRole('alert')
    summarize()

    expect(await screen.findByText('Recovered')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })
})
