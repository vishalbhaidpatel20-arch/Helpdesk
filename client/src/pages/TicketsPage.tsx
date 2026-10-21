import TicketsTable from '@/components/TicketsTable'

export default function TicketsPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold">Tickets</h1>
      <TicketsTable />
    </main>
  )
}
