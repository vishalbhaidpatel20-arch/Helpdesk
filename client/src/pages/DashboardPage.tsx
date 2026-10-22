import { Card } from '@/components/ui/card'
import TicketsPerDayChart from '@/components/TicketsPerDayChart'
import { Skeleton } from '@/components/ui/skeleton'
import { useTicketStats } from '@/hooks/useTicketStats'
import { formatDuration } from '@/lib/tickets'

// White card with a thin gray border, rounded corners, a faint shadow and comfortable padding: a small gray
// label on top and the large bold value below it
function StatCard({ label, value }: { label: string; value: string | undefined }) {
  return (
    <Card className="gap-2 border border-t-4 border-gray-200 border-t-primary bg-gradient-to-b from-indigo-50/60 to-white p-4 sm:p-6 text-black shadow-sm ring-0 transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">{label}</p>
      {value === undefined ? <Skeleton className="h-9 w-24" /> : <p className="text-2xl font-bold tracking-tight text-indigo-950 sm:text-3xl">{value}</p>}
    </Card>
  )
}

export default function DashboardPage() {
  const { data, error } = useTicketStats()

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          Failed to load the dashboard
        </p>
      ) : (
        <section aria-label="Ticket statistics" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total tickets" value={data?.total.toLocaleString('en-US')} />
          <StatCard label="Open tickets" value={data?.open.toLocaleString('en-US')} />
          <StatCard label="Resolved by AI" value={data?.resolvedByAi.toLocaleString('en-US')} />
          <StatCard label="Resolved by AI (%)" value={data && `${data.resolvedByAiPercent}%`} />
          <StatCard
            label="Average resolution time"
            value={data && (data.averageResolutionSeconds === null ? '—' : formatDuration(data.averageResolutionSeconds))}
          />
        </section>
      )}
      {!error && (
        <div className="mt-4">
          {data ? <TicketsPerDayChart days={data.ticketsPerDay} /> : <Skeleton className="h-80 w-full" />}
        </div>
      )}
    </main>
  )
}
