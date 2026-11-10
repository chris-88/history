import { ERAS } from '../historyConfig'
import type { EraId } from '../types'

import { cn } from '@/lib/utils'

import { Eyebrow } from './shared'
import { PANEL } from './styles'

export function EraNavigator({
  current,
  onSelect,
}: {
  current: EraId
  onSelect: (id: EraId) => void
}) {
  return (
    <section aria-labelledby="eras-heading" className={cn(PANEL, 'p-4 sm:p-5')}>
      <Eyebrow as="h2" id="eras-heading">
        01 / Choose an era
      </Eyebrow>
      <fieldset className="relative mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-6">
        <legend className="sr-only">Historical eras</legend>
        {ERAS.map((era) => {
          const active = era.id === current
          return (
            <button
              key={era.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(era.id)}
              className={cn(
                'focus-visible:ring-ring/60 min-h-14 min-w-[8.5rem] shrink-0 rounded-lg border px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-3',
                active
                  ? 'border-lime/60 bg-lime/10 text-foreground'
                  : 'border-line bg-surface-2 text-muted-foreground hover:border-line-strong hover:text-foreground',
              )}
            >
              <span className="block text-sm font-semibold">{era.label}</span>
              <span
                className={cn(
                  'mt-0.5 block font-mono text-[0.7rem] tabular-nums',
                  active ? 'text-lime' : 'text-faint',
                )}
              >
                {era.subtitle}
              </span>
            </button>
          )
        })}
      </fieldset>
      <p className="text-faint mt-3 text-xs leading-relaxed">
        Dates before the modern era are often approximate. The tracks describe places, not
        necessarily nation-states.
      </p>
    </section>
  )
}
