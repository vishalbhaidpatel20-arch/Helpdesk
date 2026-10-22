import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export default function TicketsPagination({ page, pageSize, total, onPageChange }: Props) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3 px-1 text-sm">
      <span className="text-muted-foreground">
        {total} {total === 1 ? 'ticket' : 'tickets'}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous"
          className="rounded-full"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeftIcon aria-hidden />
        </Button>
        <span className="min-w-20 text-center font-medium tabular-nums">
          Page {page} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next"
          className="rounded-full"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRightIcon aria-hidden />
        </Button>
      </div>
    </nav>
  )
}
