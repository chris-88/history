import { ChevronDownIcon } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import { LANES } from '../historyConfig'
import type { Lane } from '../types'

import { LaneDot } from './shared'

export function RegionFilter({
  laneSet,
  onToggle,
  onAll,
  onCore,
}: {
  laneSet: ReadonlySet<Lane>
  onToggle: (lane: Lane) => void
  onAll: () => void
  onCore: () => void
}) {
  const count = laneSet.size
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'h-11 flex-1 justify-between gap-2 px-3 sm:flex-none',
        )}
      >
        Regions ({count})
        <ChevronDownIcon aria-hidden="true" className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))] p-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAll}
            className={cn(buttonVariants({ variant: 'outline' }), 'h-11 flex-1')}
          >
            All regions
          </button>
          <button
            type="button"
            onClick={onCore}
            className={cn(buttonVariants({ variant: 'outline' }), 'h-11 flex-1')}
          >
            Original eight
          </button>
        </div>
        <fieldset className="mt-1">
          <legend className="sr-only">Regions shown on the timeline and grid</legend>
          <ul className="max-h-[min(60vh,28rem)] overflow-y-auto">
            {LANES.map((lane) => {
              const checked = laneSet.has(lane.key)
              const last = checked && count === 1
              return (
                <li key={lane.key}>
                  <label
                    className={cn(
                      'hover:bg-accent flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-sm',
                      last && 'cursor-not-allowed',
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={last}
                      onCheckedChange={() => onToggle(lane.key)}
                    />
                    <LaneDot color={lane.color} />
                    <span className="flex-1">{lane.label}</span>
                    {last && <span className="text-faint text-xs">kept</span>}
                  </label>
                </li>
              )
            })}
          </ul>
        </fieldset>
        <p className="text-faint text-xs">At least one region always stays visible.</p>
      </PopoverContent>
    </Popover>
  )
}
