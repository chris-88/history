import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MinusIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
} from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { HistoryActions, HistoryView } from '../hooks/useHistoryState'
import { CATEGORY_LABELS, DATASET, MIN_RANGE_SPAN } from '../historyConfig'
import { isValidYear } from '../lib/chronology'
import { CATEGORY_KEYS, type CategoryFilter } from '../types'

import { RegionFilter } from './RegionFilter'

const CATEGORY_ITEMS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All themes' },
  ...CATEGORY_KEYS.map((key) => ({ value: key, label: CATEGORY_LABELS[key] })),
]

const numberFormat = new Intl.NumberFormat('en-IE')

export function TimelineToolbar({ view, actions }: { view: HistoryView; actions: HistoryActions }) {
  const { state } = view
  const filtering = state.query.trim() !== '' || state.category !== 'all'
  const span = state.range.end - state.range.start

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox query={state.query} onChange={actions.setQuery} />
        <Select
          items={CATEGORY_ITEMS}
          value={state.category}
          onValueChange={(value) => {
            if (value) actions.setCategory(value)
          }}
        >
          <SelectTrigger
            aria-label="Filter by theme"
            className="flex-1 data-[size=default]:h-11 sm:w-44 sm:flex-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value} className="min-h-10">
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <RegionFilter
          laneSet={view.laneSet}
          onToggle={actions.toggleLane}
          onAll={actions.selectAllLanes}
          onCore={actions.selectCoreLanes}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <output className="text-muted-foreground block w-full text-xs tabular-nums sm:w-auto sm:pr-2">
          <span className="text-foreground font-medium">
            {numberFormat.format(view.visible.length)}
          </span>{' '}
          in view
          {filtering && <> · {numberFormat.format(view.matchingCount)} match</>} ·{' '}
          {numberFormat.format(view.totalCount)} curated
        </output>
        <fieldset className="flex min-w-0 gap-1">
          <legend className="sr-only">Move and zoom the timeline</legend>
          <IconButton
            label="Pan earlier"
            onClick={actions.panEarlier}
            disabled={state.range.start <= DATASET.axisMin}
          >
            <ChevronLeftIcon />
          </IconButton>
          <IconButton
            label="Zoom out"
            onClick={actions.zoomOut}
            disabled={state.range.start <= DATASET.axisMin && state.range.end >= DATASET.axisMax}
          >
            <MinusIcon />
          </IconButton>
          <IconButton label="Zoom in" onClick={actions.zoomIn} disabled={span <= MIN_RANGE_SPAN}>
            <PlusIcon />
          </IconButton>
          <IconButton
            label="Pan later"
            onClick={actions.panLater}
            disabled={state.range.end >= DATASET.axisMax}
          >
            <ChevronRightIcon />
          </IconButton>
        </fieldset>
        <JumpToYear onJump={actions.jumpToYear} />
        <Button variant="ghost" className="h-11 px-3" onClick={actions.resetEra}>
          <RotateCcwIcon aria-hidden="true" />
          Reset era
        </Button>
      </div>
    </div>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <Button
      variant="outline"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="size-11"
    >
      {children}
    </Button>
  )
}

/**
 * The URL trims the query, so the field keeps its own text (a typed trailing space survives)
 * and only follows the URL when the query changes from elsewhere, e.g. picking a result.
 */
function SearchBox({ query, onChange }: { query: string; onChange: (q: string) => void }) {
  const [text, setText] = useState(query)
  const [lastQuery, setLastQuery] = useState(query)
  if (query !== lastQuery) {
    setLastQuery(query)
    if (query !== text.trim()) setText(query)
  }
  return (
    <div className="relative w-full sm:w-72">
      <SearchIcon
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
      />
      <Input
        type="search"
        aria-label="Search all events"
        placeholder="Search events, e.g. Vikings, Rome, 1916"
        autoComplete="off"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          onChange(e.target.value)
        }}
        className="h-11 pl-9"
      />
    </div>
  )
}

function JumpToYear({ onJump }: { onJump: (year: number) => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const hintId = useId()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = value.trim()
    const year = Number(trimmed)
    if (!/^-?\d+$/.test(trimmed) || !isValidYear(year, DATASET.minYear, DATASET.maxYear)) {
      setError(
        year === 0 && trimmed !== ''
          ? 'There is no year 0: use -1 for 1 BCE or 1 for 1 CE.'
          : 'Enter a whole year from -10000 to 1999.',
      )
      return
    }
    setError(null)
    onJump(year)
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-1" noValidate>
      <Input
        type="number"
        inputMode="numeric"
        step={1}
        min={DATASET.minYear}
        max={DATASET.maxYear}
        placeholder="Year"
        aria-label="Jump to year"
        aria-describedby={hintId}
        aria-invalid={error ? true : undefined}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setError(null)
        }}
        className="h-11 w-24 tabular-nums"
      />
      <Button type="submit" variant="secondary" className="h-11 px-4">
        Go
      </Button>
      <span id={hintId} className={error ? 'text-destructive w-full text-xs' : 'sr-only'}>
        {error ?? 'Use a negative number for BCE, for example -3200.'}
      </span>
    </form>
  )
}
