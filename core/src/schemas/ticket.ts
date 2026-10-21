import { z } from 'zod'

// Mirror the Prisma enums of the same name (server/prisma/schema.prisma)
export const TicketStatus = { OPEN: 'OPEN', RESOLVED: 'RESOLVED', CLOSED: 'CLOSED' } as const
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus]

export const TicketCategory = {
  GENERAL_QUESTION: 'GENERAL_QUESTION',
  TECHNICAL_QUESTION: 'TECHNICAL_QUESTION',
  REFUND_REQUEST: 'REFUND_REQUEST',
} as const
export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory]

// A support email as delivered to the inbound webhook (provider adapters map their payload onto this)
export const inboundEmailSchema = z.object({
  senderEmail: z
    .string({ error: 'Sender email is required' })
    .trim()
    .toLowerCase()
    .min(1, 'Sender email is required')
    .pipe(z.email('Enter a valid sender email address')),
  senderName: z
    .string({ error: 'Sender name is required' })
    .trim()
    .min(1, 'Sender name is required')
    .max(200, 'Sender name must be at most 200 characters'),
  subject: z
    .string({ error: 'Subject is required' })
    .trim()
    .max(255, 'Subject must be at most 255 characters')
    .transform((subject) => subject || '(no subject)'),
  text: z.string({ error: 'Email body is required' }).trim().min(1, 'Email body is required').max(50_000, 'Email body is too long'),
  messageId: z.string().trim().min(1).max(998).optional(),
})

export type InboundEmailInput = z.infer<typeof inboundEmailSchema>

// Query string of GET /api/tickets (also used by the client to read/write the page's URL)
export const TICKET_SORT_FIELDS = ['createdAt', 'subject', 'status'] as const
export type TicketSortField = (typeof TICKET_SORT_FIELDS)[number]
export const DEFAULT_TICKET_PAGE_SIZE = 20
export const MAX_TICKET_PAGE_SIZE = 100
export const MAX_TICKET_SEARCH_LENGTH = 200

export const ticketListQuerySchema = z.object({
  status: z.enum(TicketStatus, { error: 'Invalid status' }).optional(),
  category: z.enum(TicketCategory, { error: 'Invalid category' }).optional(),
  // Matches subject, sender name, sender email and message text; blank means no search
  search: z
    .string()
    .trim()
    .max(MAX_TICKET_SEARCH_LENGTH, `Search must be at most ${MAX_TICKET_SEARCH_LENGTH} characters`)
    .transform((search) => search || undefined)
    .optional(),
  // Newest first by default
  sort: z.enum(TICKET_SORT_FIELDS, { error: 'Invalid sort field' }).default('createdAt'),
  order: z.enum(['asc', 'desc'], { error: 'Order must be asc or desc' }).default('desc'),
  page: z.coerce.number({ error: 'Page must be a number' }).int().min(1, 'Page must be at least 1').default(1),
  pageSize: z.coerce
    .number({ error: 'Page size must be a number' })
    .int()
    .min(1, 'Page size must be at least 1')
    .max(MAX_TICKET_PAGE_SIZE, `Page size must be at most ${MAX_TICKET_PAGE_SIZE}`)
    .default(DEFAULT_TICKET_PAGE_SIZE),
})

export type TicketListQuery = z.infer<typeof ticketListQuerySchema>

// A ticket as returned by GET /api/tickets
export type Ticket = {
  id: number
  subject: string
  senderName: string
  senderEmail: string
  status: TicketStatus
  category: TicketCategory | null
  createdAt: string
}

// Response of GET /api/tickets: one page of tickets plus the total matching the filters
export type TicketListResponse = {
  tickets: Ticket[]
  total: number
  page: number
  pageSize: number
}
