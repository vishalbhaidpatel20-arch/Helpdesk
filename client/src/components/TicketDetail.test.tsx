import { render, screen } from '@testing-library/react'
import { TicketStatus, type Ticket } from '@helpdesk/core'
import { describe, expect, it } from 'vitest'
import { formatDateTime } from '@/lib/tickets'
import TicketDetail from './TicketDetail'

const ticket: Ticket = {
  id: 7,
  subject: 'Cannot log in',
  body: 'Line one\nLine two',
  senderName: 'Jo Customer',
  senderEmail: 'jo@example.com',
  status: TicketStatus.OPEN,
  category: null,
  assignedTo: null,
  createdAt: '2026-05-06T10:00:00.000Z',
  updatedAt: '2026-05-07T12:30:00.000Z',
}

describe('TicketDetail', () => {
  it('shows the sender name and email', () => {
    render(<TicketDetail ticket={ticket} />)
    expect(screen.getByText('Jo Customer (jo@example.com)')).toBeInTheDocument()
  })

  it('shows the created and updated dates', () => {
    render(<TicketDetail ticket={ticket} />)
    expect(screen.getByText(formatDateTime(ticket.createdAt))).toBeInTheDocument()
    expect(screen.getByText(formatDateTime(ticket.updatedAt))).toBeInTheDocument()
  })

  it('shows the subject and the message body', () => {
    render(<TicketDetail ticket={ticket} />)
    expect(screen.getByText('Cannot log in')).toBeInTheDocument()
    expect(screen.getByText(/Line one\s+Line two/)).toBeInTheDocument()
  })

  it('renders email content as plain text, not HTML', () => {
    const html = '<b>bold</b><img src=x onerror=alert(1)>'
    const { container } = render(<TicketDetail ticket={{ ...ticket, body: html }} />)
    expect(screen.getByText(html)).toBeInTheDocument()
    expect(container.querySelector('b, img')).toBeNull()
  })
})
