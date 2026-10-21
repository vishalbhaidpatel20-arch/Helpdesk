import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { useForm, useWatch } from 'react-hook-form'
import { createReplySchema, type CreateReplyInput } from '@helpdesk/core'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateReply, usePolishReply } from '@/hooks/useReplies'

export default function ReplyForm({ ticketId }: { ticketId: string | undefined }) {
  const createReply = useCreateReply(ticketId)
  const polishReply = usePolishReply(ticketId)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    getValues,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateReplyInput>({
    resolver: zodResolver(createReplySchema),
    defaultValues: { body: '' },
  })

  function errorMessage(err: unknown, fallback: string) {
    return axios.isAxiosError(err) && typeof err.response?.data?.error === 'string'
      ? err.response.data.error
      : fallback
  }

  const isBlank = useWatch({ control, name: 'body' }).trim() === ''

  async function onSubmit(values: CreateReplyInput) {
    try {
      await createReply.mutateAsync(values)
      reset()
    } catch (err) {
      setError('root', { message: errorMessage(err, 'Failed to send reply') })
    }
  }

  // Replaces the draft with the AI-improved text; the agent can still edit it before sending
  async function onPolish() {
    clearErrors()
    const draft = getValues('body')
    const parsed = createReplySchema.safeParse({ body: draft })
    if (!parsed.success) {
      setError('body', { message: parsed.error.issues[0].message })
      return
    }
    try {
      setValue('body', await polishReply.mutateAsync(parsed.data), { shouldDirty: true })
    } catch (err) {
      setError('root', { message: errorMessage(err, 'Failed to polish reply') })
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
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onPolish} disabled={isSubmitting || polishReply.isPending}>
          {polishReply.isPending ? 'Polishing...' : 'Polish'}
        </Button>
        <Button type="submit" disabled={isBlank || isSubmitting || polishReply.isPending}>
          {isSubmitting ? 'Sending...' : 'Send reply'}
        </Button>
      </div>
    </form>
  )
}
