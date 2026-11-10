import { EyeOffIcon } from 'lucide-react'
import { useEffect, useRef, type RefObject } from 'react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { CATEGORY_LABELS, laneMeta } from '../historyConfig'
import { formatEventDate } from '../lib/chronology'
import { nearbyEvents, sameYearSiblings } from '../lib/proximity'
import type { HistoricalEvent } from '../types'

import { ExternalLink, Eyebrow, LaneDot } from './shared'
import { PANEL, wikipediaSearchUrl } from './styles'

export function EventDetails({
  events,
  selected,
  hidden,
  cluster,
  focusRequest,
  suggestions,
  onSelect,
}: {
  events: readonly HistoricalEvent[]
  selected: HistoricalEvent | null
  hidden: boolean
  /** Ids sharing the clicked timeline mark, when the selection came from one. */
  cluster: readonly string[] | null
  /** Bumped when focus should move to the event title (e.g. after picking a search result). */
  focusRequest: number
  /** With nothing selected: events at (or nearest to) the focus year, as starting points. */
  suggestions: { title: string; events: readonly HistoricalEvent[] }
  onSelect: (id: string) => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const handled = useRef(0)
  const selectedId = selected?.id

  useEffect(() => {
    if (focusRequest !== handled.current && selectedId && headingRef.current) {
      handled.current = focusRequest
      headingRef.current.focus()
    }
  }, [focusRequest, selectedId])

  return (
    <aside
      aria-labelledby="details-heading"
      className={cn(PANEL, 'min-w-0 p-4 sm:p-5 lg:sticky lg:top-4')}
    >
      <Eyebrow as="h2" id="details-heading">
        03 / Event explorer
      </Eyebrow>
      <div aria-live="polite">
        {selected ? (
          <Selected
            events={events}
            event={selected}
            hidden={hidden}
            cluster={cluster}
            onSelect={onSelect}
            headingRef={headingRef}
          />
        ) : (
          <>
            <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
              Select a mark on the timeline, a search result or an entry in the comparison grid to
              read about it and open its Wikipedia article.
            </p>
            {suggestions.events.length > 0 && (
              <EventList
                title={suggestions.title}
                events={suggestions.events}
                onSelect={onSelect}
              />
            )}
          </>
        )}
      </div>
    </aside>
  )
}

function Selected({
  events,
  event,
  hidden,
  cluster,
  onSelect,
  headingRef,
}: {
  events: readonly HistoricalEvent[]
  event: HistoricalEvent
  hidden: boolean
  cluster: readonly string[] | null
  onSelect: (id: string) => void
  headingRef: RefObject<HTMLHeadingElement | null>
}) {
  const lane = laneMeta(event.lane)
  const siblings = sameYearSiblings(events, event)
  const siblingIds = new Set(siblings.map((e) => e.id))
  const markMates =
    cluster && cluster.includes(event.id)
      ? events.filter((e) => cluster.includes(e.id) && e.id !== event.id && !siblingIds.has(e.id))
      : []
  const nearby = nearbyEvents(events, event, 5)

  return (
    <div className="mt-4">
      <p className="text-highlight text-3xl font-semibold tracking-tight tabular-nums">
        {formatEventDate(event)}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground flex items-center gap-2 font-mono text-[0.7rem] tracking-[0.12em] uppercase">
          <LaneDot color={lane.color} />
          {lane.label}
        </span>
        <Badge variant="outline" className="text-muted-foreground">
          {CATEGORY_LABELS[event.category]}
        </Badge>
        {hidden && (
          <Badge variant="secondary" className="text-highlight">
            <EyeOffIcon aria-hidden="true" />
            Hidden by current filters
          </Badge>
        )}
      </div>
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="mt-4 text-xl leading-snug font-semibold tracking-tight outline-none"
      >
        {event.title}
      </h3>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{event.note}</p>

      <ExternalLink
        href={event.wikipediaUrl}
        className="border-lime/40 bg-lime/10 text-lime hover:bg-lime/15 focus-visible:ring-ring/60 mt-5 flex min-h-11 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-semibold outline-none focus-visible:ring-3"
      >
        <span>Read on Wikipedia — {event.wikipediaArticle}</span>
      </ExternalLink>
      <ExternalLink
        href={wikipediaSearchUrl(event.title)}
        icon={false}
        className="text-muted-foreground hover:text-foreground mt-2 inline-flex min-h-8 items-center text-xs underline underline-offset-4"
      >
        Search Wikipedia for this title
      </ExternalLink>

      {siblings.length > 0 && (
        <EventList
          title={`Also this year in ${lane.label}`}
          events={siblings}
          onSelect={onSelect}
          showRegion={false}
        />
      )}
      {markMates.length > 0 && (
        <EventList
          title="Also in this mark"
          events={markMates}
          onSelect={onSelect}
          showRegion={false}
        />
      )}
      <EventList
        title="Elsewhere around this time"
        caption="Nearby in time, not necessarily related."
        events={nearby}
        onSelect={onSelect}
        empty="No other curated events in other regions fall within the same approximate period."
      />
    </div>
  )
}

function EventList({
  title,
  caption,
  events,
  onSelect,
  empty,
  showRegion = true,
}: {
  title: string
  caption?: string
  events: readonly HistoricalEvent[]
  onSelect: (id: string) => void
  empty?: string
  showRegion?: boolean
}) {
  return (
    <section className="border-line mt-6 border-t pt-4">
      <h4 className="font-mono text-[0.7rem] tracking-[0.14em] uppercase">{title}</h4>
      {caption && <p className="text-faint mt-1 text-xs">{caption}</p>}
      {events.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-sm">{empty}</p>
      ) : (
        <ul className="mt-2">
          {events.map((e) => {
            const lane = laneMeta(e.lane)
            return (
              <li key={e.id} className="border-line border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => onSelect(e.id)}
                  className="hover:text-lime focus-visible:ring-ring/60 flex min-h-11 w-full flex-col items-start gap-0.5 rounded-sm py-2 text-left outline-none focus-visible:ring-3"
                >
                  <span className="text-muted-foreground flex items-center gap-1.5 text-[0.7rem] tabular-nums">
                    {showRegion && <LaneDot color={lane.color} className="size-2" />}
                    {formatEventDate(e)}
                    {showRegion && ` · ${lane.label}`}
                  </span>
                  <span className="text-sm font-medium">{e.title}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
