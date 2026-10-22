import CreateUserDialog from '@/components/CreateUserDialog'
import UsersTable from '@/components/UsersTable'

export default function UsersPage() {
  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Users</h1>
        <CreateUserDialog />
      </div>
      <UsersTable />
    </main>
  )
}
