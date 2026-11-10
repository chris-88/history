import type { HistoricalEvent } from '@/features/history/types'
import { toAxisYear } from '@/features/history/lib/chronology'

let counter = 0

/** A valid event with sensible defaults; override what the test cares about. */
export function makeEvent(overrides: Partial<HistoricalEvent> = {}): HistoricalEvent {
  counter += 1
  const year = overrides.year ?? 1916
  return {
    id: `evt_test${counter}`,
    year,
    axisYear: toAxisYear(year),
    displayYear: year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`,
    lane: 'Ireland',
    category: 'politics',
    title: `Event ${counter}`,
    note: `Note ${counter}`,
    approximate: false,
    wikipediaUrl: `https://en.wikipedia.org/wiki/Event_${counter}`,
    wikipediaArticle: `Event ${counter}`,
    source: 'original',
    ...overrides,
  }
}

export const CSV_HEADER =
  'event_id,year,display_year,lane,cat,title,note,approx,wikipedia_url,wikipedia_article,source'

export function csvRow(fields: Partial<Record<string, string>> = {}): string {
  const row = {
    event_id: 'evt_a',
    year: '1916',
    display_year: '1916 CE',
    lane: 'Ireland',
    cat: 'conflict',
    title: 'Easter Rising',
    note: 'Rebels proclaim a republic.',
    approx: 'False',
    wikipedia_url: 'https://en.wikipedia.org/wiki/Easter_Rising',
    wikipedia_article: 'Easter Rising',
    source: 'original',
    ...fields,
  }
  return [
    row.event_id,
    row.year,
    row.display_year,
    row.lane,
    row.cat,
    row.title,
    row.note,
    row.approx,
    row.wikipedia_url,
    row.wikipedia_article,
    row.source,
  ].join(',')
}

export function csv(...rows: string[]): string {
  return [CSV_HEADER, ...rows].join('\n') + '\n'
}
