import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Label and value on one line, or the label above the value when stacked (for form controls)
export default function Field({
  label,
  stacked,
  children,
}: {
  label: string
  stacked?: boolean
  children: ReactNode
}) {
  return (
    <div className={cn('flex gap-2', stacked && 'flex-col gap-1')}>
      <dt className="shrink-0 text-muted-foreground">{stacked ? label : `${label}:`}</dt>
      <dd className={cn(stacked && 'flex flex-col items-start gap-1 *:w-full')}>{children}</dd>
    </div>
  )
}
