import TicketFilters from '@/components/TicketFilters'
import TicketsPagination from '@/components/TicketsPagination'
import TicketsTable from '@/components/TicketsTable'
import { useTicketParams } from '@/hooks/useTicketParams'
import { useTickets } from '@/hooks/useTickets'

export default function TicketsPage() {
  const { params, setParams } = useTicketParams()
  const { data, error } = useTickets(params)

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-3xl font-bold">Tickets</h1>
      <TicketFilters params={params} onChange={setParams} />
      {error ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          Failed to load tickets
        </p>
      ) : (
        <>
          {/* The table reports sort changes; the server does the sorting */}
          <TicketsTable tickets={data?.tickets} params={params} onSortChange={setParams} />
          {data && (
            <TicketsPagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              onPageChange={(page) => setParams({ page })}
            />
          )}
        </>
      )}
    </main>
  )
}
