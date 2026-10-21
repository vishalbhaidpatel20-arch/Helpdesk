import axios from 'axios'
import { Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useDeleteUser, type User } from '@/hooks/useUsers'

// Asks for confirmation before deleting. The error state resets on close because the content unmounts.
export default function DeleteUserDialog({ user }: { user: User }) {
  const [open, setOpen] = useState(false)
  const deleteUser = useDeleteUser()

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (!next) deleteUser.reset()
  }

  async function onConfirm() {
    await deleteUser.mutateAsync(user.id).then(
      () => setOpen(false),
      () => {},
    )
  }

  const error = deleteUser.error
    ? axios.isAxiosError(deleteUser.error) && typeof deleteUser.error.response?.data?.error === 'string'
      ? deleteUser.error.response.data.error
      : 'Failed to delete user'
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Delete ${user.name}`}>
          <Trash2Icon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete user</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {user.name} ({user.email})? They will no longer be able to sign in.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={deleteUser.isPending} onClick={onConfirm}>
            {deleteUser.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
