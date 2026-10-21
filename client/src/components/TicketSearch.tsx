import { MAX_TICKET_SEARCH_LENGTH } from '@helpdesk/core'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'

const DEBOUNCE_MS = 300

type Props = {
  // The search currently applied (from the URL)
  value: string | undefined
  onChange: (search: string | undefined) => void
}

// Search box for the ticket list. Typing is debounced so the API is not called on every keystroke;
// the text is reported to the URL once the user pauses.
export default function TicketSearch({ value, onChange }: Props) {
  const [text, setText] = useState(value ?? '')
  const [appliedValue, setAppliedValue] = useState(value)

  // Follow the URL when it changes from elsewhere (back/forward, a shared link). Keep the typed text when it
  // already matches, so a trailing space typed mid-sentence is not trimmed away.
  if (value !== appliedValue) {
    setAppliedValue(value)
    if ((text.trim() || undefined) !== value) setText(value ?? '')
  }

  useEffect(() => {
    const search = text.trim() || undefined
    if (search === value) return
    const timer = setTimeout(() => onChange(search), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [text, value, onChange])

  return (
    <div className="relative w-full sm:w-80">
      <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label="Search tickets"
        placeholder="Search tickets by subject, sender or message…"
        maxLength={MAX_TICKET_SEARCH_LENGTH}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full pl-8"
      />
    </div>
  )
}
