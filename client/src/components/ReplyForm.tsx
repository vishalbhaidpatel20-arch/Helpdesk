import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { createReplySchema, type CreateReplyInput } from '@helpdesk/core'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateReply } from '@/hooks/useReplies'

export default function ReplyForm({ ticketId }: { ticketId: string | undefined }) {
  const createReply = useCreateReply(ticketId)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateReplyInput>({
    resolver: zodResolver(createReplySchema),
    defaultValues: { body: '' },
  })

  async function onSubmit(values: CreateReplyInput) {
    try {
      await createReply.mutateAsync(values)
      reset()
    } catch (err) {
      const message =
        axios.isAxiosError(err) && typeof err.response?.data?.error === 'string'
          ? err.response.data.error
          : 'Failed to send reply'
      setError('root', { message })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
      {errors.root && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.root.message}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="reply-body">Reply</Label>
        <Textarea id="reply-body" rows={4} aria-invalid={!!errors.body} {...register('body')} />
        {errors.body && <p className="text-sm text-destructive">{errors.body.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Send reply'}
      </Button>
    </form>
  )
}
