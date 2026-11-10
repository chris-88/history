import Papa from 'papaparse'
import { z } from 'zod'

import { CATEGORY_KEYS, LANE_KEYS, type HistoricalEvent } from '../types'
import { isValidYear, toAxisYear } from './chronology'

export interface ParseIssue {
  /** 1-based line in the CSV file (the header is line 1). */
  line: number
  message: string
}

export type ParseResult =
  { ok: true; events: HistoricalEvent[] } | { ok: false; issues: ParseIssue[] }

export class HistoryDataError extends Error {
  readonly issues: ParseIssue[]

  constructor(issues: ParseIssue[]) {
    super(`history-events.csv has ${issues.length} problem${issues.length === 1 ? '' : 's'}`)
    this.name = 'HistoryDataError'
    this.issues = issues
  }
}

const wikipediaUrl = z
  .string()
  .trim()
  .refine((value) => {
    try {
      const url = new URL(value)
      return (
        url.protocol === 'https:' &&
        url.hostname === 'en.wikipedia.org' &&
        url.pathname.startsWith('/wiki/')
      )
    } catch {
      return false
    }
  }, 'must be an https://en.wikipedia.org/wiki/... URL')

const boolText = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const lower = value.toLowerCase()
    if (lower === 'true') return true
    if (lower === 'false') return false
    ctx.addIssue({ code: 'custom', message: `approx must be True or False, got "${value}"` })
    return z.NEVER
  })

const yearText = z
  .string()
  .trim()
  .regex(/^-?\d+$/, 'year must be a signed integer')
  .transform(Number)
  .refine((year) => isValidYear(year), 'year must be in [-10000, -1] or [1, 1999] (no year 0)')

/** One raw CSV row. Titles and notes are kept exactly as authored (no trim). */
const rowSchema = z.object({
  event_id: z.string().trim().min(1, 'event_id is required'),
  year: yearText,
  display_year: z.string().min(1, 'display_year is required'),
  lane: z.string().trim().pipe(z.enum(LANE_KEYS)),
  cat: z.string().trim().pipe(z.enum(CATEGORY_KEYS)),
  title: z.string().min(1, 'title is required'),
  note: z.string().min(1, 'note is required'),
  approx: boolText,
  wikipedia_url: wikipediaUrl,
  wikipedia_article: z.string().min(1, 'wikipedia_article is required'),
  source: z
    .string()
    .trim()
    .pipe(z.enum(['original', 'expanded'])),
})

export const REQUIRED_COLUMNS = Object.keys(rowSchema.shape)

/**
 * Parse the CSV text into validated events. Any invalid row fails the whole file: the
 * dataset is a curated static asset and a half-loaded timeline would mislead.
 * Events come back sorted by axis year, CSV order preserved within a year.
 */
export function parseHistoryCsv(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
  })

  const issues: ParseIssue[] = parsed.errors
    .filter((e) => e.code !== 'UndetectableDelimiter')
    .map((e) => ({ line: (e.row ?? -2) + 2, message: e.message }))

  const columns = parsed.meta.fields ?? []
  const missing = REQUIRED_COLUMNS.filter((c) => !columns.includes(c))
  if (missing.length) {
    return {
      ok: false,
      issues: [{ line: 1, message: `missing columns: ${missing.join(', ')}` }, ...issues],
    }
  }

  const events: HistoricalEvent[] = []
  const seen = new Map<string, number>()

  parsed.data.forEach((raw, index) => {
    const line = index + 2
    const result = rowSchema.safeParse(raw)
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push({ line, message: `${issue.path.join('.')}: ${issue.message}` })
      }
      return
    }
    const row = result.data
    const firstLine = seen.get(row.event_id)
    if (firstLine !== undefined) {
      issues.push({
        line,
        message: `duplicate event_id "${row.event_id}" (first seen on line ${firstLine})`,
      })
      return
    }
    seen.set(row.event_id, line)
    events.push({
      id: row.event_id,
      year: row.year,
      axisYear: toAxisYear(row.year),
      displayYear: row.display_year,
      lane: row.lane,
      category: row.cat,
      title: row.title,
      note: row.note,
      approximate: row.approx,
      wikipediaUrl: row.wikipedia_url,
      wikipediaArticle: row.wikipedia_article,
      source: row.source,
    })
  })

  if (issues.length) return { ok: false, issues: issues.sort((a, b) => a.line - b.line) }

  const stable = events.map((event, order) => ({ event, order }))
  stable.sort((a, b) => a.event.axisYear - b.event.axisYear || a.order - b.order)
  return { ok: true, events: stable.map((s) => s.event) }
}
