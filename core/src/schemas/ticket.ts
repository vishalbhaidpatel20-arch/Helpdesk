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
