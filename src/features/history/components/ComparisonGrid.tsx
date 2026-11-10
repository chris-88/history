import { useMemo } from 'react'

import { cn } from '@/lib/utils'

import { laneMeta } from '../historyConfig'
import { formatAxisYear, formatEventDate, fromAxisYear } from '../lib/chronology'
import { gridBuckets, gridScaleLabel, gridStepForYear, type GridBucket } from '../lib/grid'
import type { HistoricalEvent, Lane } from '../types'

import { ExternalLink, Eyebrow, LaneDot } from './shared'
import { PANEL } from './styles'

const SHOWN_PER_CELL = 2

export function ComparisonGrid({
  events,
  lanes,
  focus,
  selectedId,
  onSelect,
}: {
  /** Events passing the category and search filters, anywhere in time. */
  events: readonly HistoricalEvent[]
  lanes: readonly Lane[]
  focus: number
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const step = gridStepForYear(fromAxisYear(focus))
  const buckets = useMemo(() => gridBuckets(focus, step), [focus, step])
  const cells = useMemo(() => {
    const map = new Map<string, HistoricalEvent[]>()
    const first = buckets[0]
    const last = buckets[buckets.length - 1]
    if (!first || !last) return map
    for (const event of events) {
      if (event.axisYear < first.start || event.axisYear > last.end) continue
      const bucket = buckets.find((b) => event.axisYear >= b.start && event.axisYear <= b.end)
      if (!bucket) continue
      const key = `${bucket.start}|${event.lane}`
      const list = map.get(key)
      if (list) list.push(event)
      else map.set(key, [event])
    }
    return map
  }, [events, buckets])
  const scale = `${gridScaleLabel(step)} · ${lanes.length} region${lanes.length === 1 ? '' : 's'}`

  return (
    <section aria-labelledby="grid-heading" className={cn(PANEL, 'min-w-0 p-4 sm:p-5')}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div>
          <Eyebrow>04 / Same time, different places</Eyebrow>
          <h2 id="grid-heading" className="mt-1.5 text-lg font-semibold tracking-tight sm:text-xl">
            Parallel comparison grid
          </h2>
          <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-relaxed">
            Read across a row to see what else was happening at the same time. Earlier rows group
            years into longer periods because older dates are less precise.
          </p>
        </div>
        <p className="text-lime shrink-0 font-mono text-[0.72rem] tracking-[0.12em] uppercase">
          {scale}
        </p>
      </div>

      <div className="border-line relative mt-4 max-h-[80vh] overflow-auto overscroll-x-contain rounded-lg border">
        <table className="w-max min-w-full border-separate border-spacing-0 text-left">
          <caption className="sr-only">
            Curated events by period (rows) and region (columns), {scale.toLowerCase()}, centred on{' '}
            {formatAxisYear(focus)}. Blank cells mean no curated entry.
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="bg-surface-2 border-line text-muted-foreground sticky top-0 left-0 z-30 w-28 min-w-28 border-r border-b px-3 py-3 font-mono text-[0.66rem] font-normal tracking-[0.14em] uppercase sm:w-36 sm:min-w-36"
              >
                Period
              </th>
              {lanes.map((key) => {
                const lane = laneMeta(key)
                return (
                  <th
                    key={key}
                    scope="col"
                    className="bg-surface-2 border-line sticky top-0 z-20 w-52 min-w-52 border-r border-b px-3 py-3 text-[0.72rem] font-semibold last:border-r-0"
                  >
                    <span className="flex items-center gap-2">
                      <LaneDot color={lane.color} />
                      {lane.label}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket) => (
              <Row
                key={bucket.start}
                bucket={bucket}
                lanes={lanes}
                cells={cells}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-faint mt-3 text-xs leading-relaxed">
        <span className="text-muted-foreground">Scroll sideways for more regions →</span> Select an
        event to read it; <span className="text-muted-foreground">↗ Wiki</span> opens its Wikipedia
        article in a new tab. A blank cell means no curated entry, not that nothing happened.
      </p>
    </section>
  )
}

function Row({
  bucket,
  lanes,
  cells,
  selectedId,
  onSelect,
}: {
  bucket: GridBucket
  lanes: readonly Lane[]
  cells: ReadonlyMap<string, HistoricalEvent[]>
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <tr aria-current={bucket.isFocus ? 'true' : undefined}>
      <th
        scope="row"
        className={cn(
          'border-line sticky left-0 z-10 border-r border-b px-3 py-3 align-top font-mono text-[0.75rem] font-medium tabular-nums',
          bucket.isFocus
            ? 'text-highlight bg-[color-mix(in_oklab,var(--color-highlight)_14%,var(--card))]'
            : 'bg-surface text-foreground',
        )}
      >
        {bucket.label}
        {bucket.isFocus && <span className="sr-only"> (focus period)</span>}
      </th>
      {lanes.map((key) => {
        const lane = laneMeta(key)
        const list = cells.get(`${bucket.start}|${key}`) ?? []
        const extra = list[SHOWN_PER_CELL]
        return (
          <td
            key={key}
            className={cn(
              'border-line border-r border-b px-2 py-2 align-top last:border-r-0',
              bucket.isFocus && 'bg-highlight/[0.05]',
            )}
          >
            {list.length === 0 ? (
              <>
                <span aria-hidden="true" className="text-faint block px-2 py-1">
                  —
                </span>
                <span className="sr-only">No curated entry</span>
              </>
            ) : (
              <ul className="space-y-1.5">
                {list.slice(0, SHOWN_PER_CELL).map((event) => {
                  const selected = event.id === selectedId
                  return (
                    <li key={event.id} className="flex items-start gap-1">
                      <button
                        type="button"
                        aria-current={selected ? 'true' : undefined}
                        onClick={() => onSelect(event.id)}
                        className={cn(
                          'focus-visible:ring-ring/60 block min-h-11 min-w-0 flex-1 rounded-r-md border-l-[3px] px-2 py-1.5 text-left text-xs leading-snug font-medium outline-none focus-visible:ring-3',
                          selected ? 'bg-highlight/12 text-highlight' : 'hover:bg-accent',
                        )}
                        style={{ borderLeftColor: selected ? '#f5d78a' : lane.color }}
                      >
                        {bucket.startYear !== bucket.endYear && (
                          <span className="text-muted-foreground block font-mono text-[0.66rem] font-normal tabular-nums">
                            {formatEventDate(event)}
                          </span>
                        )}
                        {event.title}
                      </button>
                      <ExternalLink
                        href={event.wikipediaUrl}
                        icon={false}
                        srLabel={`: ${event.wikipediaArticle} on Wikipedia (opens in a new tab)`}
                        className="text-lime/80 hover:text-lime focus-visible:ring-ring/60 inline-flex min-h-11 shrink-0 items-center rounded-sm px-1 text-[0.68rem] font-medium whitespace-nowrap outline-none focus-visible:ring-3"
                      >
                        <span aria-hidden="true">↗ Wiki</span>
                      </ExternalLink>
                    </li>
                  )
                })}
                {extra && (
                  <li>
                    <button
                      type="button"
                      onClick={() => onSelect(extra.id)}
                      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/60 min-h-8 rounded-sm px-2 text-[0.7rem] outline-none focus-visible:ring-3"
                    >
                      +{list.length - SHOWN_PER_CELL} more
                      <span className="sr-only">
                        {' '}
                        in {lane.label}, {bucket.label}: open {extra.title}
                      </span>
                    </button>
                  </li>
                )}
              </ul>
            )}
          </td>
        )
      })}
    </tr>
  )
}
