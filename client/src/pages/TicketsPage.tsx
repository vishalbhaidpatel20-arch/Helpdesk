import type { TicketSortField } from '@helpdesk/core'
import TicketFilters from '@/components/TicketFilters'
import TicketsPagination from '@/components/TicketsPagination'
import TicketsTable from '@/components/TicketsTable'
import { useTicketParams } from '@/hooks/useTicketParams'
import { useTickets } from '@/hooks/useTickets'

export default function TicketsPage() {
  const { params, setParams } = useTicketParams()
  const { data, error } = useTickets(params)

  // Clicking the sorted column flips the direction; a new column starts newest / A-Z first
  function onSort(field: TicketSortField) {
    if (params.sort === field) {
      setParams({ order: params.order === 'asc' ? 'desc' : 'asc' })
    } else {
      setParams({ sort: field, order: field === 'createdAt' ? 'desc' : 'asc' })
    }
  }

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
          <TicketsTable tickets={data?.tickets} params={params} onSort={onSort} />
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
