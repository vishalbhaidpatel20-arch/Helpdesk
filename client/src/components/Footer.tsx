import { useEffect, useRef, useState } from 'react'
import AppLink from '@/components/AppLink'
import Logo from '@/components/Logo'
import { cn } from '@/lib/utils'

const year = new Date().getFullYear()

const copyright = `© ${year} Helpdesk. All rights reserved.`

// Desktop footer: sits right under the content (it is not pushed to the bottom of the screen on short pages). Phones
// use MobileCopyright and the bottom navigation bar instead.
export default function Footer() {
  return (
    <footer className="hidden border-t bg-background sm:block">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="space-y-2">
          <Logo className="text-lg" />
          <p className="max-w-xs text-sm text-muted-foreground">
            AI-powered ticket management: every customer email answered faster.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <AppLink to="/">Home</AppLink>
          <AppLink to="/dashboard">Dashboard</AppLink>
          <AppLink to="/tickets">Tickets</AppLink>
        </nav>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">{copyright}</div>
    </footer>
  )
}

// Height reserved at the end of the page on phones: the bottom navigation bar (4rem) plus the copyright strip. Keep in
// sync with the bottom padding in Layout (pb-26).
const MOBILE_BOTTOM_SPACE_REM = 6.5

// Phones only: a copyright strip fixed above the bottom navigation bar. It fades in only when the page is long enough
// to scroll and the end of it has been reached (the sentinel at the end of the content is above the reserved space),
// so it never shows on short pages and never covers content.
export function MobileCopyright() {
  const sentinel = useRef<HTMLDivElement>(null)
  const [atEnd, setAtEnd] = useState(false)

  useEffect(() => {
    const update = () => {
      const element = sentinel.current
      if (!element) return
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      const scrollable = document.documentElement.scrollHeight > window.innerHeight + 1
      const reachedEnd = element.getBoundingClientRect().top <= window.innerHeight - MOBILE_BOTTOM_SPACE_REM * rem
      setAtEnd(scrollable && reachedEnd)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    // The page grows and shrinks as data loads or filters change
    const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update)
    resizeObserver?.observe(document.body)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      resizeObserver?.disconnect()
    }
  }, [])

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-px sm:hidden" />
      <p
        className={cn(
          'fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 bg-background/95 py-2 text-center text-xs text-muted-foreground transition-opacity duration-200 sm:hidden',
          atEnd ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        {copyright}
      </p>
    </>
  )
}
