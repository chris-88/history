import { laneMeta } from '../historyConfig'
import type { HistoricalEvent } from '../types'

/**
 * How far apart two events can be and still count as "around the same time". Wider for
 * older periods because the dates themselves are coarser. In years.
 */
export function proximityTolerance(year: number): number {
  if (year < -3000) return 600
  if (year < -500) return 220
  if (year < 500) return 70
  if (year < 1500) return 40
  if (year < 1800) return 18
  return 3
}

/**
 * Events in OTHER regions near the given event in time. This is temporal proximity only:
 * nothing here claims the events are connected.
 */
export function nearbyEvents(
  events: readonly HistoricalEvent[],
  event: HistoricalEvent,
  limit = 5,
): HistoricalEvent[] {
  const tolerance = proximityTolerance(event.year)
  return events
    .filter(
      (other) =>
        other.id !== event.id &&
        other.lane !== event.lane &&
        Math.abs(other.axisYear - event.axisYear) <= tolerance,
    )
    .sort(
      (a, b) =>
        Math.abs(a.axisYear - event.axisYear) - Math.abs(b.axisYear - event.axisYear) ||
        laneMeta(a.lane).index - laneMeta(b.lane).index,
    )
    .slice(0, limit)
}

/** Other events in the SAME region and year as the given one (shares a mark on the timeline). */
export function sameYearSiblings(
  events: readonly HistoricalEvent[],
  event: HistoricalEvent,
): HistoricalEvent[] {
  return events.filter(
    (other) =>
      other.id !== event.id && other.lane === event.lane && other.axisYear === event.axisYear,
  )
}
