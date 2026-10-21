import axios from 'axios'
import { SparklesIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useSummarizeTicket } from '@/hooks/useTicketSummary'

// Summarize button plus the AI summary of the ticket and its replies; every click regenerates it
export default function TicketSummary({ ticketId }: { ticketId: string | undefined }) {
  const summarize = useSummarizeTicket(ticketId)

  return (
    <section aria-label="Summary" className="space-y-3">
      <Button type="button" variant="outline" onClick={() => summarize.mutate()} disabled={summarize.isPending}>
        <SparklesIcon aria-hidden />
        {summarize.isPending ? 'Summarizing...' : 'Summarize'}
      </Button>
      {summarize.isError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {axios.isAxiosError(summarize.error) && typeof summarize.error.response?.data?.error === 'string'
            ? summarize.error.response.data.error
            : 'Failed to summarize ticket'}
        </p>
      )}
      {summarize.data !== undefined && (
        <Card>
          <CardContent>
            {/* AI output derived from untrusted email content: render as plain text only */}
            <p className="whitespace-pre-wrap text-sm">{summarize.data}</p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
