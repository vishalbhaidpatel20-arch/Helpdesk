import { TicketCategory, TicketStatus } from '@helpdesk/core'

// Display labels for the ticket enums (the values themselves come from @helpdesk/core)
export const statusLabels: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Open',
  [TicketStatus.RESOLVED]: 'Resolved',
  [TicketStatus.CLOSED]: 'Closed',
}

// M/D/YYYY, h:mm:ss AM/PM (fixed locale so the format doesn't depend on the browser's settings)
export function formatDateTime(date: string) {
  return new Date(date).toLocaleString('en-US')
}

export const categoryLabels: Record<TicketCategory, string> = {
  [TicketCategory.GENERAL_QUESTION]: 'General Question',
  [TicketCategory.TECHNICAL_QUESTION]: 'Technical Question',
  [TicketCategory.REFUND_REQUEST]: 'Refund Request',
}
