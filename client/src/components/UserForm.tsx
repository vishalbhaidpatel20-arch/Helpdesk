import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { createUserSchema, updateUserSchema, type UpdateUserInput } from '@helpdesk/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateUser, useUpdateUser, type User } from '@/hooks/useUsers'

// Creates a user, or edits `user` when given. When editing, an empty password leaves the password unchanged.
export default function UserForm({ user, onSuccess }: { user?: User; onSuccess: () => void }) {
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(user ? updateUserSchema : createUserSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '', password: '' },
  })

  async function onSubmit(values: UpdateUserInput) {
    try {
      if (user) {
        await updateUser.mutateAsync({ id: user.id, ...values })
      } else {
        await createUser.mutateAsync({ ...values, password: values.password ?? '' })
      }
      onSuccess()
    } catch (err) {
      const message =
        axios.isAxiosError(err) && typeof err.response?.data?.error === 'string'
          ? err.response.data.error
          : user
            ? 'Failed to update user'
            : 'Failed to create user'
      setError('root', { message })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {errors.root && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.root.message}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" autoComplete="off" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-user-email">Email</Label>
        <Input
          id="new-user-email"
          type="email"
          autoComplete="off"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-user-password">Password</Label>
        <Input
          id="new-user-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {user && !errors.password && (
          <p className="text-sm text-muted-foreground">Leave blank to keep the current password.</p>
        )}
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (user ? 'Saving...' : 'Creating...') : user ? 'Save changes' : 'Create user'}
      </Button>
    </form>
  )
}
