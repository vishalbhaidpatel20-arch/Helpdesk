import { fireEvent, render, screen, within } from '@testing-library/react'
import type { TicketsPerDay } from '@helpdesk/core'
import { describe, expect, it } from 'vitest'
import TicketsPerDayChart from './TicketsPerDayChart'

// 30 days from 2026-10-01 (UTC); day i has i % 4 tickets, so some days are empty
const days: TicketsPerDay[] = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10),
  count: i % 4,
}))
const total = days.reduce((sum, day) => sum + day.count, 0)

describe('TicketsPerDayChart', () => {
  it('names the chart and summarizes the period', () => {
    render(<TicketsPerDayChart days={days} />)

    expect(screen.getByText('Tickets per day')).toBeInTheDocument()
    expect(screen.getByText(`Last 30 days · ${total} tickets`)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /tickets created per day over the last 30 days/i })).toBeInTheDocument()
  })

  it('draws a bar for each day that has tickets', () => {
    const { container } = render(<TicketsPerDayChart days={days} />)
    expect(container.querySelectorAll('[data-slot="bar"]')).toHaveLength(days.filter((day) => day.count > 0).length)
  })

  it('lists every day with its count in a table for screen readers', () => {
    render(<TicketsPerDayChart days={days} />)

    const rows = within(screen.getByRole('table', { name: 'Tickets created per day' })).getAllByRole('row')
    expect(rows).toHaveLength(31)
    expect(rows[1]).toHaveTextContent('Oct 1')
    expect(rows[3]).toHaveTextContent('Oct 3')
    expect(rows[3]).toHaveTextContent('2')
  })

  it('shows the day and count of the hovered bar and hides it again on leave', () => {
    const { container } = render(<TicketsPerDayChart days={days} />)
    const hits = container.querySelectorAll('[data-slot="hit"]')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    fireEvent.mouseEnter(hits[2]!)
    expect(screen.getByRole('status')).toHaveTextContent('Oct 3 · 2 tickets')

    fireEvent.mouseEnter(hits[1]!)
    expect(screen.getByRole('status')).toHaveTextContent('Oct 2 · 1 ticket')

    fireEvent.mouseLeave(screen.getByRole('img').parentElement!)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders with no tickets at all', () => {
    const empty = days.map((day) => ({ ...day, count: 0 }))
    const { container } = render(<TicketsPerDayChart days={empty} />)

    expect(screen.getByText('Last 30 days · 0 tickets')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="bar"]')).toHaveLength(0)
  })
})
