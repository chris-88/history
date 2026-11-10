import { toAxisYear } from './lib/chronology'
import type { Era, EraId, EventCategory, Lane } from './types'

export interface LaneMeta {
  key: Lane
  label: string
  /** One-line gloss shown under the label: what the track covers over time. */
  tiny: string
  /** Distinct hue for marks, dots and grid accents; chosen for a dark background. */
  color: string
}

/** Display order is the array order. */
export const LANES: readonly LaneMeta[] = [
  {
    key: 'Ireland',
    label: 'Ireland',
    tiny: 'Island and its historical polities',
    color: '#3ed2a2',
  },
  {
    key: 'Britain',
    label: 'Britain / England',
    tiny: 'Britain and its changing states',
    color: '#efbd76',
  },
  {
    key: 'Germany',
    label: 'Central Europe / Germany',
    tiny: 'Franks · Holy Roman Empire · Germany',
    color: '#e58983',
  },
  {
    key: 'France',
    label: 'Gaul / France',
    tiny: 'Gaul · Francia · modern France',
    color: '#80abff',
  },
  {
    key: 'Russia',
    label: 'Eastern Europe / Russia',
    tiny: "Rus' · Russian Empire · USSR",
    color: '#bc9cff',
  },
  {
    key: 'USA',
    label: 'North America / USA',
    tiny: 'Precolonial North America · United States',
    color: '#f4a781',
  },
  { key: 'China', label: 'China', tiny: 'Chinese cultural regions and states', color: '#f180a8' },
  {
    key: 'Asia',
    label: 'East & SE Asia',
    tiny: 'Japan · Korea · Southeast Asia',
    color: '#71ced2',
  },
  {
    key: 'South Asia',
    label: 'India / South Asia',
    tiny: 'Indus · Indian subcontinent',
    color: '#c6df85',
  },
  {
    key: 'Mediterranean',
    label: 'Mediterranean / Rome',
    tiny: 'Greek · Roman · Byzantine worlds',
    color: '#d5b5f8',
  },
  {
    key: 'Middle East',
    label: 'Middle East',
    tiny: 'Mesopotamia · Persia · Islam · Ottomans',
    color: '#f1d17b',
  },
  {
    key: 'Africa',
    label: 'Africa / Egypt',
    tiny: 'African civilisations and states',
    color: '#f5ad83',
  },
  {
    key: 'Americas',
    label: 'Americas (other)',
    tiny: 'Precolonial and colonial Americas',
    color: '#b8ddee',
  },
  { key: 'Europe', label: 'Wider Europe', tiny: 'Cross-European developments', color: '#a7b6c5' },
]

export const LANE_BY_KEY: ReadonlyMap<Lane, LaneMeta & { index: number }> = new Map(
  LANES.map((lane, index) => [lane.key, { ...lane, index }]),
)

export function laneMeta(key: Lane): LaneMeta & { index: number } {
  const meta = LANE_BY_KEY.get(key)
  if (!meta) throw new Error(`Unknown lane: ${key}`)
  return meta
}

/** The original comparison set; the default for the modern era. */
export const CORE_LANES: readonly Lane[] = [
  'Ireland',
  'Britain',
  'Germany',
  'France',
  'Russia',
  'USA',
  'China',
  'Asia',
]

export const ALL_LANES: readonly Lane[] = LANES.map((l) => l.key)

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  politics: 'Politics',
  conflict: 'War / conflict',
  rights: 'Rights / reform',
  society: 'Society',
  culture: 'Culture',
  economy: 'Economy',
  technology: 'Technology',
  crisis: 'Crisis',
}

function era(
  id: EraId,
  label: string,
  subtitle: string,
  start: number,
  end: number,
  focus: number,
): Era {
  return {
    id,
    label,
    subtitle,
    start,
    end,
    focus,
    axisStart: toAxisYear(start),
    axisEnd: toAxisYear(end),
    axisFocus: toAxisYear(focus),
  }
}

export const ERAS: readonly Era[] = [
  era('prehistoric', 'Prehistory', '10,000–3001 BCE', -10000, -3001, -7000),
  era('ancient', 'Ancient', '3000–501 BCE', -3000, -501, -1600),
  era('classical', 'Classical', '500 BCE–499 CE', -500, 499, 43),
  era('medieval', 'Medieval', '500–1499', 500, 1499, 1066),
  era('early', 'Early modern', '1500–1799', 1500, 1799, 1649),
  era('modern', 'Modern', '1800–1999', 1800, 1999, 1916),
]

export const DEFAULT_ERA: EraId = 'modern'

export function eraById(id: EraId): Era {
  const found = ERAS.find((e) => e.id === id)
  if (!found) throw new Error(`Unknown era: ${id}`)
  return found
}

/** The era containing an axis year; years past the end fall into the last era. */
export function eraForAxisYear(axisYear: number): Era {
  return (
    ERAS.find((e) => axisYear >= e.axisStart && axisYear <= e.axisEnd) ?? ERAS[ERAS.length - 1]!
  )
}

/** Lanes shown when the visitor has not chosen any: the core eight in the modern era, all elsewhere. */
export function defaultLanesForEra(id: EraId): readonly Lane[] {
  return id === 'modern' ? CORE_LANES : ALL_LANES
}

/** Dataset bounds in CSV years and on the axis. */
export const DATASET = {
  minYear: -10000,
  maxYear: 1999,
  axisMin: toAxisYear(-10000),
  axisMax: toAxisYear(1999),
} as const

/** Narrowest window the timeline will zoom to, in years. */
export const MIN_RANGE_SPAN = 4

/** The CSV lives in public/ so editing it never touches UI code. */
export const DATA_PATH = 'data/history-events.csv'
