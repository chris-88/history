import { laneMeta } from '../historyConfig'
import type { AxisRange, CategoryFilter, HistoricalEvent, Lane } from '../types'

export interface Filters {
  lanes: ReadonlySet<Lane>
  category: CategoryFilter
  query: string
}

function haystack(event: HistoricalEvent): string {
  return [
    event.title,
    event.note,
    event.lane,
    laneMeta(event.lane).label,
    event.wikipediaArticle,
    event.displayYear,
    String(event.year),
  ]
    .join(' ')
    .toLowerCase()
}

/** Case-insensitive substring match across title, note, region, article and year text. */
export function matchesQuery(event: HistoricalEvent, query: string): boolean {
  const q = query.trim().toLowerCase()
  return q === '' || haystack(event).includes(q)
}

export function matchesFilters(event: HistoricalEvent, filters: Filters): boolean {
  return (
    filters.lanes.has(event.lane) &&
    (filters.category === 'all' || filters.category === event.category) &&
    matchesQuery(event, filters.query)
  )
}

export function inRange(event: HistoricalEvent, range: AxisRange): boolean {
  return event.axisYear >= range.start && event.axisYear <= range.end
}

/** Events that pass the filters and fall inside the visible window. */
export function visibleEvents(
  events: readonly HistoricalEvent[],
  filters: Filters,
  range: AxisRange,
): HistoricalEvent[] {
  return events.filter((e) => inRange(e, range) && matchesFilters(e, filters))
}

/** Search the whole dataset (ignores lanes, category and range). Empty query gives nothing. */
export function searchEvents(
  events: readonly HistoricalEvent[],
  query: string,
  limit = 20,
): HistoricalEvent[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const out: HistoricalEvent[] = []
  for (const event of events) {
    if (haystack(event).includes(q)) {
      out.push(event)
      if (out.length >= limit) break
    }
  }
  return out
}

/** The visible event nearest to an axis year, preferring the earlier one on a tie. */
export function nearestEvent(
  events: readonly HistoricalEvent[],
  axisYear: number,
): HistoricalEvent | null {
  let best: HistoricalEvent | null = null
  let bestDistance = Infinity
  for (const event of events) {
    const distance = Math.abs(event.axisYear - axisYear)
    if (distance < bestDistance) {
      best = event
      bestDistance = distance
    }
  }
  return best
}
