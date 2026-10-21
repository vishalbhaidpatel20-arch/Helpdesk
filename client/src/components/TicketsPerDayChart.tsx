import { useState } from 'react'
import type { TicketsPerDay } from '@helpdesk/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const WIDTH = 720
const HEIGHT = 240
const MARGIN = { top: 12, right: 8, bottom: 28, left: 32 }
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom
const LABEL_EVERY = 5

// Fixed locale and UTC so the labels match the server's UTC days in any browser setting
const formatDay = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

// Top of the y axis: the smallest "nice" number (1, 2, 5 x 10^n) that fits the tallest bar, and at least 4 gridlines' worth
function niceMax(max: number) {
  if (max <= 4) return 4
  const magnitude = 10 ** Math.floor(Math.log10(max))
  return ([1, 2, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= max) ?? max)
}

// A bar with a rounded top (radius up to 3px) and a flat bottom anchored to the baseline
function barPath(x: number, baseline: number, width: number, height: number) {
  const r = Math.min(3, width / 2, height)
  const top = baseline - height
  return `M${x},${baseline}V${top + r}Q${x},${top} ${x + r},${top}H${x + width - r}Q${x + width},${top} ${x + width},${top + r}V${baseline}Z`
}

// Bar chart of tickets created per day. One series, so no legend: the card title names it. A visually hidden
// table carries the same numbers for screen readers.
export default function TicketsPerDayChart({ days }: { days: TicketsPerDay[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const top = niceMax(Math.max(...days.map((day) => day.count)))
  const band = PLOT_WIDTH / days.length
  const barWidth = Math.max(band * 0.6, 2)
  const gridlines = [0, 1, 2, 3, 4].map((i) => (top / 4) * i)
  const y = (value: number) => MARGIN.top + PLOT_HEIGHT - (value / top) * PLOT_HEIGHT
  const active = hovered === null ? null : days[hovered]
  const total = days.reduce((sum, day) => sum + day.count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tickets per day</CardTitle>
        <p className="text-sm text-muted-foreground">
          Last {days.length} days · {total.toLocaleString('en-US')} tickets
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative" onMouseLeave={() => setHovered(null)}>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full"
            role="img"
            aria-label={`Bar chart of tickets created per day over the last ${days.length} days`}
          >
            {gridlines.map((value) => (
              <g key={value}>
                <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(value)} y2={y(value)} className="stroke-border" strokeWidth={1} />
                <text x={MARGIN.left - 6} y={y(value)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[10px]">
                  {value}
                </text>
              </g>
            ))}
            {days.map((day, i) => {
              const x = MARGIN.left + i * band + (band - barWidth) / 2
              const height = (day.count / top) * PLOT_HEIGHT
              return (
                <g key={day.date}>
                  {day.count > 0 && (
                    // Rounded top, flat bottom anchored to the baseline
                    <path
                      data-slot="bar"
                      d={barPath(x, y(0), barWidth, height)}
                      className={hovered === null || hovered === i ? 'fill-primary' : 'fill-primary/40'}
                    />
                  )}
                  {/* Wider than the bar and full height, so days with no or short bars are easy to hover */}
                  <rect
                    data-slot="hit"
                    x={MARGIN.left + i * band}
                    y={MARGIN.top}
                    width={band}
                    height={PLOT_HEIGHT}
                    fill="transparent"
                    onMouseEnter={() => setHovered(i)}
                  />
                  {(i % LABEL_EVERY === 0 || i === days.length - 1) && (
                    <text x={x + barWidth / 2} y={HEIGHT - 8} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                      {formatDay(day.date)}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
          {active && hovered !== null && (
            <div
              role="status"
              className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10"
              style={{ left: `${((MARGIN.left + (hovered + 0.5) * band) / WIDTH) * 100}%` }}
            >
              {formatDay(active.date)} · {active.count} {active.count === 1 ? 'ticket' : 'tickets'}
            </div>
          )}
        </div>
        <table className="sr-only">
          <caption>Tickets created per day</caption>
          <thead>
            <tr>
              <th>Day</th>
              <th>Tickets</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.date}>
                <td>{formatDay(day.date)}</td>
                <td>{day.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
