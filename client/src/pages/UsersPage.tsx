import CreateUserDialog from '@/components/CreateUserDialog'
import UsersTable from '@/components/UsersTable'

export default function UsersPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Users</h1>
        <CreateUserDialog />
      </div>
      <UsersTable />
    </main>
  )
}
