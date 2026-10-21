import {
  createColumnHelper,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { TicketStatus, type Ticket, type TicketListQuery, type TicketSortField } from '@helpdesk/core'
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from 'lucide-react'
import { useMemo } from 'react'
import AppLink from '@/components/AppLink'
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
import { categoryLabels, statusLabels } from '@/lib/tickets'

type Sort = Pick<TicketListQuery, 'sort' | 'order'>

type Props = {
  // undefined while the first page loads
  tickets: Ticket[] | undefined
  params: Sort
  onSortChange: (sort: Sort) => void
}

// Sorting happens on the server (the API returns rows already ordered), so TanStack Table only tracks
// the sort state and renders the headers: manualSorting means it never reorders the rows itself.
const features = tableFeatures({ rowSortingFeature })
const helper = createColumnHelper<typeof features, Ticket>()

// Column ids of the sortable columns must match the API's sort fields (TicketSortField)
const columns = helper.columns([
  helper.accessor('subject', {
    header: 'Subject',
    sortDescFirst: false,
    cell: (info) => (
      <AppLink variant="text" to={`/tickets/${info.row.original.id}`}>
        {info.getValue()}
      </AppLink>
    ),
  }),
  helper.display({
    id: 'sender',
    header: 'Sender',
    enableSorting: false,
    cell: ({ row }) => (
      <>
        <div>{row.original.senderName}</div>
        <div className="text-muted-foreground">{row.original.senderEmail}</div>
      </>
    ),
  }),
  helper.accessor('status', {
    header: 'Status',
    sortDescFirst: false,
    cell: (info) => (
      <Badge variant={info.getValue() === TicketStatus.OPEN ? 'default' : 'secondary'}>
        {statusLabels[info.getValue()]}
      </Badge>
    ),
  }),
  helper.accessor('category', {
    header: 'Category',
    enableSorting: false,
    cell: (info) => (
      <span className="text-muted-foreground">
        {info.getValue() ? categoryLabels[info.getValue()!] : '—'}
      </span>
    ),
  }),
  helper.accessor('createdAt', {
    header: 'Received',
    // Newest first is the natural first direction for dates
    sortDescFirst: true,
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
])

const NO_TICKETS: Ticket[] = []

export default function TicketsTable({ tickets, params, onSortChange }: Props) {
  const sorting = useMemo(
    () => [{ id: params.sort, desc: params.order === 'desc' }],
    [params.sort, params.order],
  )

  const table = useTable({
    features,
    columns,
    data: tickets ?? NO_TICKETS,
    manualSorting: true,
    // The API always needs a sort, so clicking cycles asc <-> desc and never clears it
    enableSortingRemoval: false,
    enableMultiSort: false,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      const [first] = next
      if (first) {
        onSortChange({ sort: first.id as TicketSortField, order: first.desc ? 'desc' : 'asc' })
      }
    },
  })

  return (
    <Table className="mt-4" aria-busy={tickets === undefined}>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const sorted = header.column.getIsSorted()
              const Icon = sorted === 'asc' ? ArrowUpIcon : sorted === 'desc' ? ArrowDownIcon : ArrowUpDownIcon
              return (
                <TableHead
                  key={header.id}
                  aria-sort={
                    header.column.getCanSort()
                      ? sorted === 'asc'
                        ? 'ascending'
                        : sorted === 'desc'
                          ? 'descending'
                          : 'none'
                      : undefined
                  }
                >
                  {header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className="inline-flex items-center gap-1 rounded-sm font-medium hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <table.FlexRender header={header} />
                      <Icon className="size-3.5" aria-hidden />
                    </button>
                  ) : (
                    <table.FlexRender header={header} />
                  )}
                </TableHead>
              )
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {tickets === undefined ? (
          Array.from({ length: 5 }, (_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-56" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-40" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
            </TableRow>
          ))
        ) : tickets.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
              No tickets found
            </TableCell>
          </TableRow>
        ) : (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
