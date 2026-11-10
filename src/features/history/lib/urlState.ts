import { ALL_LANES, DEFAULT_ERA, ERAS, eraById, eraForAxisYear, laneMeta } from '../historyConfig'
import {
  CATEGORY_KEYS,
  type CategoryFilter,
  type EraId,
  type HistoricalEvent,
  type HistoryState,
  type Lane,
} from '../types'
import { fromAxisYear, isValidYear, toAxisYear } from './chronology'
import { clampRange, clampYear } from './navigation'

/**
 * URL query parameters (inside the hash route, e.g. `#/?era=modern&year=1916&event=evt_…`).
 * Defaults are omitted so the bare URL stays canonical.
 */
export const PARAM = {
  era: 'era',
  year: 'year',
  event: 'event',
  lanes: 'lanes',
  category: 'cat',
  query: 'q',
  from: 'from',
  to: 'to',
} as const

function parseEra(value: string | null): EraId | null {
  return ERAS.some((e) => e.id === value) ? (value as EraId) : null
}

function parseYear(value: string | null): number | null {
  if (value === null || !/^-?\d+$/.test(value.trim())) return null
  const year = Number(value)
  return isValidYear(year) ? year : null
}

function parseLanes(value: string | null): readonly Lane[] | null {
  if (value === null) return null
  const wanted = new Set(value.split(',').map((s) => s.trim()))
  const lanes = ALL_LANES.filter((lane) => wanted.has(lane))
  return lanes.length ? lanes : null
}

function parseCategory(value: string | null): CategoryFilter {
  return CATEGORY_KEYS.some((c) => c === value) ? (value as CategoryFilter) : 'all'
}

/** Build the full state from URL params. Invalid or missing values fall back to defaults. */
export function parseUrlState(
  params: URLSearchParams,
  eventsById: ReadonlyMap<string, HistoricalEvent>,
): HistoryState {
  const eventParam = params.get(PARAM.event)
  const selected = eventParam ? (eventsById.get(eventParam) ?? null) : null

  const yearParam = parseYear(params.get(PARAM.year))
  const eraParam = parseEra(params.get(PARAM.era))

  let focus: number
  let eraId: EraId
  if (selected) {
    focus = selected.axisYear
    eraId = eraParam ?? eraForAxisYear(focus).id
  } else if (yearParam !== null) {
    focus = toAxisYear(yearParam)
    eraId = eraParam ?? eraForAxisYear(focus).id
  } else {
    eraId = eraParam ?? DEFAULT_ERA
    focus = eraById(eraId).axisFocus
  }

  const era = eraById(eraId)
  const from = parseYear(params.get(PARAM.from))
  const to = parseYear(params.get(PARAM.to))
  let range = { start: era.axisStart, end: era.axisEnd }
  if (from !== null && to !== null && from < to) {
    range = clampRange({ start: toAxisYear(from), end: toAxisYear(to) })
  }
  focus = clampYear(focus, range)

  return {
    era: eraId,
    range,
    focus,
    selectedEventId: selected?.id ?? null,
    lanes: parseLanes(params.get(PARAM.lanes)),
    category: parseCategory(params.get(PARAM.category)),
    query: (params.get(PARAM.query) ?? '').trim(),
  }
}

/** Serialise state to URL params, leaving out anything at its default. */
export function serializeUrlState(state: HistoryState): URLSearchParams {
  const params = new URLSearchParams()
  const era = eraById(state.era)
  if (state.era !== DEFAULT_ERA) params.set(PARAM.era, state.era)
  if (state.selectedEventId) params.set(PARAM.event, state.selectedEventId)
  else if (state.focus !== era.axisFocus) params.set(PARAM.year, String(fromAxisYear(state.focus)))
  if (state.range.start !== era.axisStart || state.range.end !== era.axisEnd) {
    params.set(PARAM.from, String(fromAxisYear(state.range.start)))
    params.set(PARAM.to, String(fromAxisYear(state.range.end)))
  }
  if (state.lanes) {
    const ordered = [...state.lanes].sort((a, b) => laneMeta(a).index - laneMeta(b).index)
    params.set(PARAM.lanes, ordered.join(','))
  }
  if (state.category !== 'all') params.set(PARAM.category, state.category)
  if (state.query) params.set(PARAM.query, state.query)
  return params
}
