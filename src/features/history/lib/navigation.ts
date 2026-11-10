import { DATASET, MIN_RANGE_SPAN } from '../historyConfig'
import type { AxisRange } from '../types'

const BOUNDS: AxisRange = { start: DATASET.axisMin, end: DATASET.axisMax }

/** Keep a window inside the dataset, preserving its width where possible. */
export function clampRange(range: AxisRange, bounds: AxisRange = BOUNDS): AxisRange {
  let start = Math.round(range.start)
  let end = Math.round(range.end)
  if (end - start < MIN_RANGE_SPAN) {
    const mid = (start + end) / 2
    start = Math.round(mid - MIN_RANGE_SPAN / 2)
    end = start + MIN_RANGE_SPAN
  }
  const width = Math.min(end - start, bounds.end - bounds.start)
  if (start < bounds.start) {
    start = bounds.start
    end = start + width
  }
  if (end > bounds.end) {
    end = bounds.end
    start = end - width
  }
  return { start: Math.max(bounds.start, start), end: Math.min(bounds.end, end) }
}

export function clampYear(axisYear: number, bounds: AxisRange = BOUNDS): number {
  return Math.min(bounds.end, Math.max(bounds.start, Math.round(axisYear)))
}

/** Zoom around a pivot. `factor` < 1 zooms in, > 1 zooms out. */
export function zoomRange(range: AxisRange, pivot: number, factor: number): AxisRange {
  const width = (range.end - range.start) * factor
  const ratio = (pivot - range.start) / Math.max(1, range.end - range.start)
  const start = pivot - width * ratio
  return clampRange({ start, end: start + width })
}

/** Slide by a fraction of the window width. Negative goes earlier. */
export function panRange(range: AxisRange, fraction: number): AxisRange {
  const delta = (range.end - range.start) * fraction
  return clampRange({ start: range.start + delta, end: range.end + delta })
}

export function rangeContains(range: AxisRange, axisYear: number): boolean {
  return axisYear >= range.start && axisYear <= range.end
}

export const ZOOM_IN_FACTOR = 0.68
export const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR
export const PAN_FRACTION = 0.33
