import { Link, type LinkProps } from 'react-router'
import { cn } from '@/lib/utils'

// Shared styling for in-app links, so call sites don't repeat the hover/colour utilities.
// muted: secondary links (nav, "back to"); text: a link inside content (e.g. a table cell).
const variants = {
  muted: 'text-sm text-muted-foreground hover:text-foreground',
  text: 'font-medium hover:underline',
} as const

type Props = LinkProps & { variant?: keyof typeof variants }

export default function AppLink({ variant = 'muted', className, ...props }: Props) {
  return <Link className={cn(variants[variant], className)} {...props} />
}
