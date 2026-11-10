import { DATASET } from '../historyConfig'
import { formatYear, fromAxisYear, toAxisYear } from './chronology'
import type { AxisRange } from '../types'

/** Comparison-grid bucket width for a focus year (CSV year), per the spec's scale table. */
export function gridStepForYear(year: number): number {
  if (year >= 1800) return 1
  if (year >= 1500) return 5
  if (year >= 500) return 20
  if (year >= -500) return 50
  if (year >= -3000) return 200
  return 500
}

export interface GridBucket extends AxisRange {
  /** CSV years of the period. */
  startYear: number
  endYear: number
  /** `1916 CE` for single years, `50 – 1 BCE`, `1 – 49 CE`, `3,200 – 3,001 BCE` for periods. */
  label: string
  isFocus: boolean
}

function bucketLabel(startYear: number, endYear: number): string {
  if (startYear === endYear) return formatYear(startYear)
  if (startYear < 0 && endYear < 0) {
    return `${formatYear(startYear, { era: false }).replace(' BCE', '')} – ${formatYear(endYear)}`
  }
  if (startYear > 0 && endYear > 0)
    return `${formatYear(startYear, { era: false })} – ${formatYear(endYear)}`
  return `${formatYear(startYear)} – ${formatYear(endYear)}`
}

/**
 * Buckets centred on the focus year, aligned to round CSV years (1500–1519, 3200–3001 BCE).
 * The bucket that would start at year 0 starts at 1 CE instead, so the boundary reads
 * "50 – 1 BCE" then "1 – 49 CE" and no year 0 is ever shown.
 */
export function gridBuckets(focusAxis: number, step: number, count = 9): GridBucket[] {
  const focusYear = fromAxisYear(focusAxis)
  const centre = Math.floor(focusYear / step) * step
  const half = Math.floor(count / 2)
  const buckets: GridBucket[] = []
  for (let i = -half; i <= half; i++) {
    let startYear = centre + i * step
    let endYear = startYear + step - 1
    if (startYear === 0) startYear = 1
    if (endYear === 0) endYear = -1
    startYear = Math.max(startYear, DATASET.minYear)
    endYear = Math.min(endYear, DATASET.maxYear)
    if (startYear > endYear || startYear === 0) continue
    const start = toAxisYear(startYear)
    const end = toAxisYear(endYear)
    buckets.push({
      start,
      end,
      startYear,
      endYear,
      label: bucketLabel(startYear, endYear),
      isFocus: focusAxis >= start && focusAxis <= end,
    })
  }
  return buckets
}

/** Human description of the bucket scale: "Year by year" or "Groups of 50 years". */
export function gridScaleLabel(step: number): string {
  return step === 1 ? 'Year by year' : `Groups of ${step} years`
}
