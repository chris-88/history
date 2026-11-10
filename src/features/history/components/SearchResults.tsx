import { laneMeta } from '../historyConfig'
import { formatEventDate } from '../lib/chronology'
import { searchEvents } from '../lib/filters'
import type { HistoricalEvent } from '../types'

import { cn } from '@/lib/utils'

import { LaneDot } from './shared'

const LIMIT = 20

export function SearchResults({
  events,
  query,
  onPick,
}: {
  events: readonly HistoricalEvent[]
  query: string
  onPick: (id: string) => void
}) {
  const q = query.trim()
  if (!q) return null
  const results = searchEvents(events, q, LIMIT)

  return (
    <section
      aria-label="Search results"
      className="border-line-strong bg-surface-2 rounded-xl border p-2"
    >
      <p className="text-muted-foreground px-2 py-1.5 text-xs" aria-live="polite">
        {results.length === 0
          ? 'No matching events in this curated selection.'
          : `${results.length === LIMIT ? 'First 20' : results.length} result${results.length === 1 ? '' : 's'} for “${q}” across all eras. Pick one to travel there.`}
      </p>
      {results.length > 0 && (
        <ul className="max-h-72 overflow-y-auto">
          {results.map((event) => {
            const lane = laneMeta(event.lane)
            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onPick(event.id)}
                  className={cn(
                    'hover:bg-accent focus-visible:ring-ring/60 flex min-h-11 w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left outline-none focus-visible:ring-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
                  )}
                >
                  <span className="text-sm font-medium">{event.title}</span>
                  <span className="text-muted-foreground flex items-center gap-2 text-xs whitespace-nowrap tabular-nums">
                    <LaneDot color={lane.color} className="size-2" />
                    {formatEventDate(event)} · {lane.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
