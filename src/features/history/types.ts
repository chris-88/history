export const LANE_KEYS = [
  'Ireland',
  'Britain',
  'Germany',
  'France',
  'Russia',
  'USA',
  'China',
  'Asia',
  'South Asia',
  'Mediterranean',
  'Middle East',
  'Africa',
  'Americas',
  'Europe',
] as const

export type Lane = (typeof LANE_KEYS)[number]

export const CATEGORY_KEYS = [
  'politics',
  'conflict',
  'rights',
  'society',
  'culture',
  'economy',
  'technology',
  'crisis',
] as const

export type EventCategory = (typeof CATEGORY_KEYS)[number]

export type EventSource = 'original' | 'expanded'

export interface HistoricalEvent {
  /** CSV `event_id`: stable public identifier (React key, URL param). */
  id: string
  /** CSV year: negative is BCE, positive is CE, never 0. */
  year: number
  /** Continuous axis coordinate: 1 BCE is 0, 1 CE is 1. See chronology.ts. */
  axisYear: number
  /** Authored human-readable date, without the `c.` prefix. */
  displayYear: string
  lane: Lane
  category: EventCategory
  title: string
  note: string
  approximate: boolean
  wikipediaUrl: string
  wikipediaArticle: string
  source: EventSource
}

export type EraId = 'prehistoric' | 'ancient' | 'classical' | 'medieval' | 'early' | 'modern'

export interface Era {
  id: EraId
  label: string
  /** Human range, e.g. `3000–501 BCE`. */
  subtitle: string
  /** Bounds in CSV years (inclusive). */
  start: number
  end: number
  /** Initial focus in CSV years. */
  focus: number
  /** Same bounds and focus as axis years. */
  axisStart: number
  axisEnd: number
  axisFocus: number
}

/** An inclusive range on the axis. */
export interface AxisRange {
  start: number
  end: number
}

export type CategoryFilter = EventCategory | 'all'

export interface HistoryState {
  era: EraId
  /** Visible window, axis years, inclusive. */
  range: AxisRange
  /** Focus year on the axis. */
  focus: number
  selectedEventId: string | null
  /** `null` means "the era's default lanes". Ordered as LANE_KEYS. */
  lanes: readonly Lane[] | null
  category: CategoryFilter
  query: string
}
