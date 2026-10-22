import { Link, type LinkProps } from 'react-router'
import { cn } from '@/lib/utils'

// Shared styling for in-app links, so call sites don't repeat the hover/colour utilities.
// muted: secondary links (nav, "back to"); text: a link inside content (e.g. a table cell).
const variants = {
  muted: 'text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
  text: 'font-medium text-foreground underline-offset-4 transition-colors hover:underline',
} as const

type Props = LinkProps & { variant?: keyof typeof variants }

export default function AppLink({ variant = 'muted', className, ...props }: Props) {
  return <Link className={cn(variants[variant], className)} {...props} />
}
