import axios from 'axios'
import DeleteUserDialog from '@/components/DeleteUserDialog'
import EditUserDialog from '@/components/EditUserDialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useUsers } from '@/hooks/useUsers'
import { Role } from '@/lib/roles'

export default function UsersTable() {
  const { data: users, error: queryError } = useUsers()
  const error = queryError
    ? axios.isAxiosError(queryError) && queryError.response?.status === 403
      ? 'Not allowed'
      : 'Failed to load users'
    : null

  return error ? (
    <p role="alert" className="mt-4 text-sm text-destructive">
      {error}
    </p>
  ) : (
    <div className="mt-6 overflow-hidden rounded-xl border bg-card shadow-sm">
    <Table aria-busy={users === undefined}>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="hidden sm:table-cell">Created</TableHead>
          <TableHead className="w-24">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users === undefined ? (
          Array.from({ length: 5 }, (_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-48" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="size-8" />
              </TableCell>
            </TableRow>
          ))
        ) : users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              No users found
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <TableRow key={user.id} className="transition-colors hover:bg-accent/60">
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={user.role === Role.ADMIN ? 'default' : 'secondary'}>
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex justify-start">
                  <EditUserDialog user={user} />
                  {/* Admins cannot be deleted */}
                  {user.role !== Role.ADMIN && <DeleteUserDialog user={user} />}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
    </div>
  )
}
