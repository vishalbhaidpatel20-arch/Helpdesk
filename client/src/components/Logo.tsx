import { useId } from 'react'
import { cn } from '@/lib/utils'

// Helpdesk logo: a chat bubble with a check mark (a conversation that gets resolved) on an indigo-to-violet tile.
// Matches public/favicon.svg. The mark is decorative; the visible "Helpdesk" text next to it names the link.
export function LogoMark({ className }: { className?: string }) {
  const gradientId = useId()

  return (
    <svg aria-hidden viewBox="0 0 64 64" fill="none" className={cn('size-8 shrink-0', className)}>
      <defs>
        <linearGradient id={gradientId} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${gradientId})`} />
      <path
        d="M18 17h28a6 6 0 0 1 6 6v15a6 6 0 0 1-6 6H33l-9 8v-8h-6a6 6 0 0 1-6-6V23a6 6 0 0 1 6-6Z"
        fill="#fff"
      />
      <path d="m23 31 6 6 12-12" stroke="#6366f1" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Mark plus wordmark
export default function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-bold tracking-tight', className)}>
      <LogoMark />
      <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Helpdesk</span>
    </span>
  )
}
