import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { DATA_PATH } from '../historyConfig'
import { HistoryDataError, parseHistoryCsv } from '../lib/parseHistoryCsv'
import type { HistoricalEvent } from '../types'

export const HISTORY_EVENTS_KEY = ['history-events'] as const

/** The CSV is served from public/, so the path respects Vite's base URL on any host. */
export function historyDataUrl(): string {
  return `${import.meta.env.BASE_URL}${DATA_PATH}`
}

export async function fetchHistoryEvents(): Promise<HistoricalEvent[]> {
  const response = await fetch(historyDataUrl())
  if (!response.ok) {
    throw new Error(`Could not load ${DATA_PATH}: ${response.status} ${response.statusText}`)
  }
  const result = parseHistoryCsv(await response.text())
  if (!result.ok) throw new HistoryDataError(result.issues)
  return result.events
}

/** Loads and parses the dataset once; the result is immutable for the session. */
export function useHistoryEvents(): UseQueryResult<HistoricalEvent[], Error> {
  return useQuery({
    queryKey: HISTORY_EVENTS_KEY,
    queryFn: fetchHistoryEvents,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
