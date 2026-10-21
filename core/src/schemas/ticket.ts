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

// An agent a ticket can be assigned to (GET /api/tickets/agents)
export interface TicketAgent {
  id: string
  name: string
}

// A support ticket: the single definition of its shape. API responses use this or a Pick of it.
export interface Ticket {
  id: number
  subject: string
  // The email text (untrusted: render as plain text only)
  body: string
  senderName: string
  senderEmail: string
  status: TicketStatus
  // null until classified
  category: TicketCategory | null
  // null when the ticket is unassigned
  assignedTo: TicketAgent | null
  createdAt: string
  updatedAt: string
}

// Body of PATCH /api/tickets/:id: any of these fields, at least one. null unassigns the ticket / clears the category.
export const updateTicketSchema = z
  .object({
    assignedToId: z.string({ error: 'Agent is invalid' }).min(1, 'Agent is invalid').nullable(),
    status: z.enum(TicketStatus, { error: 'Invalid status' }),
    category: z.enum(TicketCategory, { error: 'Invalid category' }).nullable(),
  })
  .partial()
  .refine((changes) => Object.values(changes).some((value) => value !== undefined), {
    error: 'Provide at least one field to update',
  })

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>

// Response of GET /api/tickets: one page of tickets plus the total matching the filters
export type TicketListResponse = {
  tickets: Ticket[]
  total: number
  page: number
  pageSize: number
}

export const MAX_REPLY_LENGTH = 50_000

// Body of POST /api/tickets/:id/replies
export const createReplySchema = z.object({
  body: z
    .string({ error: 'Reply is required' })
    .trim()
    .min(1, 'Reply is required')
    .max(MAX_REPLY_LENGTH, `Reply must be at most ${MAX_REPLY_LENGTH} characters`),
})

export type CreateReplyInput = z.infer<typeof createReplySchema>

// A reply as returned by GET /api/tickets/:id/replies (oldest first) and POST /api/tickets/:id/replies
export interface TicketReply {
  id: number
  body: string
  author: TicketAgent
  createdAt: string
}
