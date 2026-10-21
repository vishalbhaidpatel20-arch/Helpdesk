import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useReplies } from '@/hooks/useReplies'
import { formatDateTime } from '@/lib/tickets'

export default function ReplyThread({ ticketId }: { ticketId: string | undefined }) {
  const { data: replies, error } = useReplies(ticketId)

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Failed to load replies
      </p>
    )
  }
  if (!replies) return <Skeleton className="h-20 w-full" />
  if (replies.length === 0) return <p className="text-sm text-muted-foreground">No replies yet.</p>

  return (
    <ul className="space-y-3" aria-label="Replies">
      {replies.map((reply) => (
        <li key={reply.id}>
          <Card size="sm">
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {reply.author.name} · {formatDateTime(reply.createdAt)}
              </p>
              {/* Reply text is plain text only */}
              <p className="whitespace-pre-wrap">{reply.body}</p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}
