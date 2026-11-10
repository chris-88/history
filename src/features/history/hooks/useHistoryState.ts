import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import {
  ALL_LANES,
  CORE_LANES,
  defaultLanesForEra,
  eraById,
  eraForAxisYear,
  laneMeta,
} from '../historyConfig'
import { toAxisYear } from '../lib/chronology'
import { matchesFilters, nearestEvent, visibleEvents, type Filters } from '../lib/filters'
import {
  PAN_FRACTION,
  ZOOM_IN_FACTOR,
  ZOOM_OUT_FACTOR,
  clampYear,
  panRange,
  rangeContains,
  zoomRange,
} from '../lib/navigation'
import { parseUrlState, serializeUrlState } from '../lib/urlState'
import type {
  AxisRange,
  CategoryFilter,
  Era,
  EraId,
  HistoricalEvent,
  HistoryState,
  Lane,
} from '../types'

export interface HistoryView {
  state: HistoryState
  era: Era
  /** Resolved lanes in display order (the era default when the visitor has not chosen). */
  lanes: readonly Lane[]
  laneSet: ReadonlySet<Lane>
  filters: Filters
  /** Events inside the window that pass the filters, sorted by axis year. */
  visible: HistoricalEvent[]
  /** Events passing the filters anywhere in time (for the count). */
  matchingCount: number
  totalCount: number
  selected: HistoricalEvent | null
  /** The selection exists but the current filters or window hide it. */
  selectedHidden: boolean
}

export interface HistoryActions {
  setEra: (id: EraId) => void
  resetEra: () => void
  selectEvent: (id: string | null) => void
  jumpToYear: (year: number) => void
  setFocus: (axisYear: number) => void
  setRange: (range: AxisRange) => void
  zoomIn: () => void
  zoomOut: () => void
  panEarlier: () => void
  panLater: () => void
  setLanes: (lanes: readonly Lane[]) => void
  toggleLane: (lane: Lane) => void
  selectAllLanes: () => void
  selectCoreLanes: () => void
  setCategory: (category: CategoryFilter) => void
  setQuery: (query: string) => void
}

function orderLanes(lanes: Iterable<Lane>): Lane[] {
  return [...new Set(lanes)].sort((a, b) => laneMeta(a).index - laneMeta(b).index)
}

function resolveLanes(state: HistoryState): readonly Lane[] {
  return state.lanes ?? defaultLanesForEra(state.era)
}

function filtersOf(state: HistoryState): Filters {
  return { lanes: new Set(resolveLanes(state)), category: state.category, query: state.query }
}

/** Pick the visible event nearest the focus, or nothing (never fabricate a selection). */
function withNearestSelection(
  state: HistoryState,
  events: readonly HistoricalEvent[],
): HistoryState {
  const candidates = visibleEvents(events, filtersOf(state), state.range)
  const nearest = nearestEvent(candidates, state.focus)
  return { ...state, selectedEventId: nearest?.id ?? null }
}

/** Drop the selection when it has left the window. */
function keepSelectionIfInRange(
  state: HistoryState,
  eventsById: ReadonlyMap<string, HistoricalEvent>,
): HistoryState {
  const selected = state.selectedEventId ? eventsById.get(state.selectedEventId) : null
  if (selected && rangeContains(state.range, selected.axisYear)) return state
  return { ...state, selectedEventId: null }
}

/**
 * All explorer state lives in the URL (hash query), so every view is shareable and the
 * back button works. Actions are pure transitions over HistoryState.
 */
export function useHistoryState(events: readonly HistoricalEvent[]): [HistoryView, HistoryActions] {
  const [params, setParams] = useSearchParams()

  const eventsById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events])
  const state = useMemo(() => parseUrlState(params, eventsById), [params, eventsById])

  const commit = useCallback(
    (next: HistoryState) => setParams(serializeUrlState(next), { replace: true }),
    [setParams],
  )

  const view = useMemo<HistoryView>(() => {
    const lanes = resolveLanes(state)
    const filters = filtersOf(state)
    const selected = state.selectedEventId ? (eventsById.get(state.selectedEventId) ?? null) : null
    return {
      state,
      era: eraById(state.era),
      lanes,
      laneSet: filters.lanes,
      filters,
      visible: visibleEvents(events, filters, state.range),
      matchingCount: events.filter((e) => matchesFilters(e, filters)).length,
      totalCount: events.length,
      selected,
      selectedHidden:
        selected !== null &&
        !(matchesFilters(selected, filters) && rangeContains(state.range, selected.axisYear)),
    }
  }, [state, events, eventsById])

  const actions = useMemo<HistoryActions>(() => {
    const setEra = (id: EraId) => {
      const era = eraById(id)
      commit(
        withNearestSelection(
          {
            ...state,
            era: id,
            range: { start: era.axisStart, end: era.axisEnd },
            focus: era.axisFocus,
          },
          events,
        ),
      )
    }

    const selectEvent = (id: string | null) => {
      if (id === null) {
        commit({ ...state, selectedEventId: null })
        return
      }
      const event = eventsById.get(id)
      if (!event) return
      let next: HistoryState = { ...state, selectedEventId: id, focus: event.axisYear }
      if (!rangeContains(state.range, event.axisYear)) {
        const era = eraForAxisYear(event.axisYear)
        next = { ...next, era: era.id, range: { start: era.axisStart, end: era.axisEnd } }
      }
      if (!resolveLanes(next).includes(event.lane)) {
        next = { ...next, lanes: orderLanes([...resolveLanes(next), event.lane]) }
      }
      commit(next)
    }

    const setFocus = (axisYear: number) => {
      const focus = clampYear(axisYear)
      let next: HistoryState = { ...state, focus }
      if (!rangeContains(state.range, focus)) {
        const era = eraForAxisYear(focus)
        next = { ...next, era: era.id, range: { start: era.axisStart, end: era.axisEnd } }
      }
      commit(withNearestSelection(next, events))
    }

    const setRange = (range: AxisRange) => {
      const focus = clampYear(state.focus, range)
      commit(keepSelectionIfInRange({ ...state, range, focus }, eventsById))
    }

    const setLanes = (lanes: readonly Lane[]) => {
      const ordered = orderLanes(lanes)
      if (!ordered.length) return
      commit({ ...state, lanes: ordered })
    }

    return {
      setEra,
      resetEra: () => setEra(state.era),
      selectEvent,
      jumpToYear: (year) => setFocus(toAxisYear(year)),
      setFocus,
      setRange,
      zoomIn: () => setRange(zoomRange(state.range, state.focus, ZOOM_IN_FACTOR)),
      zoomOut: () => setRange(zoomRange(state.range, state.focus, ZOOM_OUT_FACTOR)),
      panEarlier: () => setRange(panRange(state.range, -PAN_FRACTION)),
      panLater: () => setRange(panRange(state.range, PAN_FRACTION)),
      setLanes,
      toggleLane: (lane) => {
        const current = resolveLanes(state)
        setLanes(current.includes(lane) ? current.filter((l) => l !== lane) : [...current, lane])
      },
      selectAllLanes: () => setLanes(ALL_LANES),
      selectCoreLanes: () => setLanes(CORE_LANES),
      setCategory: (category) => commit({ ...state, category }),
      setQuery: (query) => commit({ ...state, query }),
    }
  }, [state, events, eventsById, commit])

  return [view, actions]
}
