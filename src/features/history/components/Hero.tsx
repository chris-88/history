import type { ReactNode } from 'react'

import { LANES } from '../historyConfig'
import { formatYear, toAxisYear } from '../lib/chronology'
import type { HistoricalEvent } from '../types'

import { Eyebrow } from './shared'

const numberFormat = new Intl.NumberFormat('en-IE')

export function Hero({
  events,
  visibleLanes,
}: {
  events: readonly HistoricalEvent[]
  visibleLanes: number
}) {
  let min = Infinity
  let max = -Infinity
  for (const e of events) {
    min = Math.min(min, e.year)
    max = Math.max(max, e.year)
  }
  const hasSpan = Number.isFinite(min) && Number.isFinite(max)
  const spanLabel = hasSpan ? `${formatYear(min)} – ${formatYear(max)}` : ''
  // No year 0, so the axis distance (+1 for the inclusive end) is the true count of years.
  const years = hasSpan ? toAxisYear(max) - toAxisYear(min) + 1 : 0
  const roundedYears = Math.round(years / 1000) * 1000

  return (
    <section aria-labelledby="hero-title" className="pt-10 pb-8 sm:pt-14">
      <Eyebrow className="text-lime">A comparative history explorer · {spanLabel}</Eyebrow>
      <h1
        id="hero-title"
        className="mt-4 text-[2.5rem] leading-[1.04] font-semibold tracking-[-0.035em] sm:text-6xl xl:text-7xl"
      >
        History, <span className="text-lime">happening together.</span>
      </h1>
      <div className="mt-5 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <p className="text-muted-foreground max-w-2xl text-base leading-relaxed sm:text-lg">
          The same moment, different places. Follow early societies, empires, revolutions and modern
          nations on one shared timeline, with a Wikipedia article for every milestone.
        </p>
        <dl className="grid shrink-0 grid-cols-3 gap-6 sm:gap-10">
          <Stat value={numberFormat.format(events.length)} label="Curated events" />
          <Stat
            value={
              <>
                {visibleLanes}
                <span className="text-faint text-lg sm:text-xl"> / {LANES.length}</span>
              </>
            }
            label="Regions in view"
          />
          <Stat value={`~${numberFormat.format(roundedYears)}`} label="Years spanned" />
        </dl>
      </div>
    </section>
  )
}

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="flex flex-col-reverse gap-1 lg:text-right">
      <dt className="text-muted-foreground font-mono text-[0.66rem] tracking-[0.14em] uppercase">
        {label}
      </dt>
      <dd className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</dd>
    </div>
  )
}
