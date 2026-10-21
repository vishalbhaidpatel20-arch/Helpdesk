import { TicketCategory, TicketStatus } from '@helpdesk/core'

// Display labels for the ticket enums (the values themselves come from @helpdesk/core)
export const statusLabels: Record<TicketStatus, string> = {
  [TicketStatus.NEW]: 'New',
  [TicketStatus.PROCESSING]: 'Processing',
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

// A length of time as its two largest units, e.g. "2d 3h", "4h 12m", "35s" (fixed format, not locale dependent)
export function formatDuration(totalSeconds: number) {
  const seconds = Math.round(totalSeconds)
  const units = [
    ['d', Math.floor(seconds / 86_400)],
    ['h', Math.floor((seconds % 86_400) / 3_600)],
    ['m', Math.floor((seconds % 3_600) / 60)],
    ['s', seconds % 60],
  ] as const
  const parts = units.filter(([, value]) => value > 0).slice(0, 2)
  return parts.length ? parts.map(([unit, value]) => `${value}${unit}`).join(' ') : '0s'
}
