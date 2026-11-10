import { RotateCwIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { ComparisonGrid } from './components/ComparisonGrid'
import { EraNavigator } from './components/EraNavigator'
import { EventDetails } from './components/EventDetails'
import { Hero } from './components/Hero'
import { HistoryTimeline } from './components/HistoryTimeline'
import { MethodNote } from './components/MethodNote'
import { SearchResults } from './components/SearchResults'
import { SiteHeader } from './components/SiteHeader'
import { TimelineToolbar } from './components/TimelineToolbar'
import { CONTAINER, PANEL } from './components/styles'
import { useHistoryEvents } from './hooks/useHistoryEvents'
import { useHistoryState } from './hooks/useHistoryState'
import { formatAxisYear, formatEventDate } from './lib/chronology'
import { matchesQuery, nearestEvent } from './lib/filters'
import { HistoryDataError } from './lib/parseHistoryCsv'
import type { HistoricalEvent } from './types'

const MAIN_ID = 'explorer'
const BASE_TITLE = 'In Parallel — history, happening together'

export function HistoryPage() {
  const { data, isPending, error, refetch, isFetching } = useHistoryEvents()

  return (
    <div className="bg-background min-h-dvh overflow-x-clip">
      <SkipLink />
      <SiteHeader />
      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} retrying={isFetching} onRetry={() => void refetch()} />
      ) : (
        <Explorer events={data} />
      )}
      <MethodNote count={data?.length ?? null} />
    </div>
  )
}

/** Moves focus without touching the hash, which HashRouter owns. */
function SkipLink() {
  return (
    <a
      href={`#${MAIN_ID}`}
      onClick={(event) => {
        event.preventDefault()
        document.getElementById(MAIN_ID)?.focus()
      }}
      className="bg-lime text-primary-foreground sr-only z-50 rounded-md px-4 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Skip to the explorer
    </a>
  )
}

function Explorer({ events }: { events: HistoricalEvent[] }) {
  const [view, actions] = useHistoryState(events)
  const [cluster, setCluster] = useState<readonly string[] | null>(null)
  const [focusRequest, setFocusRequest] = useState(0)
  const { selected } = view
  const { category, query } = view.state

  useEffect(() => {
    document.title = selected
      ? `${selected.title} (${formatEventDate(selected)}) · In Parallel`
      : BASE_TITLE
  }, [selected])

  const gridEvents = useMemo(
    () =>
      events.filter(
        (e) => (category === 'all' || e.category === category) && matchesQuery(e, query),
      ),
    [events, category, query],
  )

  const suggestions = useMemo(() => {
    const { focus } = view.state
    const exact = view.visible.filter((e) => e.axisYear === focus).slice(0, 5)
    if (exact.length) return { title: `In ${formatAxisYear(focus)}`, events: exact }
    const nearest = nearestEvent(view.visible, focus)
    return {
      title: `Nearest to ${formatAxisYear(focus)}`,
      events: nearest ? [nearest] : [],
    }
  }, [view.visible, view.state])

  const select = useCallback(
    (id: string) => {
      setCluster((current) => (current?.includes(id) ? current : null))
      actions.selectEvent(id)
    },
    [actions],
  )

  const selectCluster = useCallback(
    (ids: string[]) => {
      const first = ids[0]
      if (!first) return
      setCluster(ids.length > 1 ? ids : null)
      actions.selectEvent(first)
    },
    [actions],
  )

  const pickSearchResult = (id: string) => {
    setCluster(null)
    actions.selectEvent(id, { clearQuery: true })
    setFocusRequest((n) => n + 1)
  }

  return (
    <main id={MAIN_ID} tabIndex={-1} className={cn(CONTAINER, 'outline-none')}>
      <Hero events={events} visibleLanes={view.lanes.length} />
      <div className="flex flex-col gap-4">
        <EraNavigator current={view.state.era} onSelect={actions.setEra} />
        <TimelineToolbar view={view} actions={actions} />
        <SearchResults events={events} query={query} onPick={pickSearchResult} />
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <HistoryTimeline
            view={view}
            setRange={actions.setRange}
            onSelectCluster={selectCluster}
          />
          <EventDetails
            events={events}
            selected={selected}
            hidden={view.selectedHidden}
            cluster={cluster}
            focusRequest={focusRequest}
            suggestions={suggestions}
            onSelect={select}
          />
        </div>
        <ComparisonGrid
          events={gridEvents}
          lanes={view.lanes}
          focus={view.state.focus}
          selectedId={selected?.id ?? null}
          onSelect={select}
        />
      </div>
    </main>
  )
}

function LoadingState() {
  return (
    <main id={MAIN_ID} tabIndex={-1} className={cn(CONTAINER, 'outline-none')}>
      <output className="sr-only">Loading the timeline…</output>
      <div className="animate-pulse">
        <div aria-hidden="true">
          <div className="pt-10 pb-8 sm:pt-14">
            <div className="bg-surface-2 h-3 w-72 max-w-full rounded" />
            <div className="bg-surface-2 mt-5 h-14 w-[36rem] max-w-full rounded-lg" />
            <div className="bg-surface-2 mt-5 h-4 w-[28rem] max-w-full rounded" />
          </div>
          <div className={cn(PANEL, 'h-28')} />
          <div className="mt-4 flex gap-2">
            <div className="bg-surface-2 h-11 w-72 rounded-lg" />
            <div className="bg-surface-2 h-11 w-44 rounded-lg" />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className={cn(PANEL, 'h-[28rem]')} />
            <div className={cn(PANEL, 'h-[28rem]')} />
          </div>
        </div>
      </div>
    </main>
  )
}

function ErrorState({
  error,
  retrying,
  onRetry,
}: {
  error: Error
  retrying: boolean
  onRetry: () => void
}) {
  return (
    <main id={MAIN_ID} tabIndex={-1} className={cn(CONTAINER, 'py-12 outline-none')}>
      <div
        role="alert"
        className="border-destructive/40 bg-destructive/5 rounded-xl border p-5 sm:p-6"
      >
        <h1 className="text-xl font-semibold tracking-tight">The timeline could not load</h1>
        {error instanceof HistoryDataError ? (
          <>
            <p className="text-muted-foreground mt-2 text-sm">
              {error.message}. Each problem is listed with its line in history-events.csv:
            </p>
            <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto font-mono text-xs">
              {error.issues.map((issue, i) => (
                <li key={`${issue.line}-${i}`}>
                  <span className="text-destructive">Line {issue.line}:</span> {issue.message}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-muted-foreground mt-2 text-sm">{error.message}</p>
        )}
        <Button onClick={onRetry} disabled={retrying} className="mt-5 h-11 px-4">
          <RotateCwIcon aria-hidden="true" />
          {retrying ? 'Retrying…' : 'Retry'}
        </Button>
      </div>
    </main>
  )
}
