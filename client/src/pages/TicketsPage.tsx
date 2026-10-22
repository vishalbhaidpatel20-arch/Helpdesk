import { useEffect } from 'react'
import TicketFilters from '@/components/TicketFilters'
import TicketsPagination from '@/components/TicketsPagination'
import TicketsTable from '@/components/TicketsTable'
import { useTicketParams } from '@/hooks/useTicketParams'
import { useTickets } from '@/hooks/useTickets'

export default function TicketsPage() {
  const { params, setParams } = useTicketParams()
  const { data, error, isPlaceholderData } = useTickets(params)

  // A page past the end (an old link, or the list shrank after a filter or status change) would show an empty table
  // and "Page 5 of 2": go to the last page that exists instead
  const lastPage = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : undefined
  useEffect(() => {
    if (lastPage !== undefined && !isPlaceholderData && params.page > lastPage) setParams({ page: lastPage })
  }, [lastPage, isPlaceholderData, params.page, setParams])

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tickets</h1>
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
