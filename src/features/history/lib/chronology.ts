/**
 * Historical chronology has no year zero: 1 BCE is followed by 1 CE. The CSV stores
 * signed years (-1 is 1 BCE, 1 is 1 CE). For anything that measures distance or draws a
 * continuous axis we use an astronomical coordinate where 1 BCE is 0 and 1 CE is 1.
 */

/** CSV year to continuous axis coordinate. `-1 -> 0`, `1 -> 1`, `-500 -> -499`. */
export function toAxisYear(year: number): number {
  if (year === 0) throw new RangeError('Year 0 does not exist in the historical calendar')
  return year < 0 ? year + 1 : year
}

/** Integer axis coordinate back to a CSV year. `0 -> -1`, `1 -> 1`, `-499 -> -500`. */
export function fromAxisYear(axisYear: number): number {
  const n = Math.round(axisYear)
  return n <= 0 ? n - 1 : n
}

const formatter = new Intl.NumberFormat('en-IE')

/**
 * `-500 -> "500 BCE"`, `-9600 -> "9,600 BCE"`, `1066 -> "1066 CE"`. Follows the CSV's
 * authored style: BCE magnitudes are grouped with commas, CE years are not. `grouped`
 * overrides either way.
 */
export function formatYear(
  year: number,
  options: { era?: boolean; grouped?: boolean } = {},
): string {
  if (year === 0) throw new RangeError('Year 0 does not exist in the historical calendar')
  const { era = true, grouped = year < 0 } = options
  const magnitude = Math.abs(year)
  const digits = grouped ? formatter.format(magnitude) : String(magnitude)
  if (year < 0) return `${digits} BCE`
  return era ? `${digits} CE` : digits
}

/** Format an axis coordinate for labels, e.g. ticks. */
export function formatAxisYear(
  axisYear: number,
  options?: { era?: boolean; grouped?: boolean },
): string {
  return formatYear(fromAxisYear(axisYear), options)
}

/** The authored display string, prefixed with `c.` when the date is approximate. */
export function formatEventDate(event: { displayYear: string; approximate: boolean }): string {
  return event.approximate ? `c. ${event.displayYear}` : event.displayYear
}

/** Is `year` a legal CSV year inside the dataset bounds? */
export function isValidYear(year: number, min = -10000, max = 1999): boolean {
  return Number.isInteger(year) && year !== 0 && year >= min && year <= max
}

/**
 * A "nice" tick step for a span, in years: 1, 2, 5, 10, 20, 50 ... so that roughly
 * `targetTicks` ticks fit.
 */
export function niceStep(span: number, targetTicks = 10): number {
  const raw = span / targetTicks
  if (raw <= 1) return 1
  const power = 10 ** Math.floor(Math.log10(raw))
  const k = raw / power
  return (k <= 1 ? 1 : k <= 2 ? 2 : k <= 5 ? 5 : 10) * power
}

/** Axis tick positions for an inclusive axis range. */
export function axisTicks(start: number, end: number, targetTicks = 10): number[] {
  const step = niceStep(end - start, targetTicks)
  const ticks: number[] = []
  for (let t = Math.ceil(start / step) * step; t <= end; t += step) ticks.push(t)
  return ticks
}

/**
 * Axis tick positions at round CALENDAR years (500 BCE, 400 BCE … 100 CE), so labels read
 * naturally on both sides of the boundary. `axisTicks` rounds axis coordinates instead, which
 * puts BCE ticks on years like 401 BCE. Year 0 is skipped; it does not exist.
 */
export function calendarTicks(start: number, end: number, targetTicks = 10): number[] {
  const step = niceStep(end - start, targetTicks)
  const ticks: number[] = []
  for (let year = Math.ceil(fromAxisYear(start) / step) * step; ; year += step) {
    if (year === 0) continue
    const axis = toAxisYear(year)
    if (axis > end) break
    if (axis >= start) ticks.push(axis)
  }
  return ticks
}
