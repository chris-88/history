import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react'

import type { HistoryActions, HistoryView } from '../hooks/useHistoryState'
import { laneMeta } from '../historyConfig'
import { calendarTicks, formatAxisYear, formatEventDate } from '../lib/chronology'
import { clampRange } from '../lib/navigation'
import type { AxisRange, HistoricalEvent, Lane } from '../types'

import { cn } from '@/lib/utils'

import { Eyebrow } from './shared'
import { PANEL } from './styles'

const AXIS_H = 34
const ROW_H = 46
const BOTTOM_H = 34
const PAD = 18
const MERGE_PX = 15
const MIN_PLOT_W = 640
const DRAG_THRESHOLD = 6
const HIGHLIGHT = '#f5d78a'
const CARD = '#141a22'

interface Cluster {
  key: string
  lane: Lane
  row: number
  x: number
  y: number
  r: number
  events: HistoricalEvent[]
}

function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

/**
 * Greedy clustering per lane: an event joins the current mark while it sits within
 * MERGE_PX of the mark's centre, so overlapping dots become one counted mark. The selected
 * event always gets a mark of its own at its exact year, so it lines up with the focus guide.
 */
function buildClusters(
  events: readonly HistoricalEvent[],
  lanes: readonly Lane[],
  x: (axisYear: number) => number,
  selectedId: string | null,
): Cluster[][] {
  const rowOf = new Map(lanes.map((lane, i) => [lane, i]))
  const rows: HistoricalEvent[][][] = lanes.map(() => [])
  const centres: number[][] = lanes.map(() => [])
  let solo: { row: number; event: HistoricalEvent } | null = null
  for (const event of events) {
    const row = rowOf.get(event.lane)
    if (row === undefined) continue
    if (event.id === selectedId) {
      solo = { row, event }
      continue
    }
    const groups = rows[row]!
    const xs = centres[row]!
    const px = x(event.axisYear)
    const last = groups[groups.length - 1]
    const centre = xs[xs.length - 1]
    if (last && centre !== undefined && px - centre <= MERGE_PX) {
      last.push(event)
      xs[xs.length - 1] = centre + (px - centre) / last.length
    } else {
      groups.push([event])
      xs.push(px)
    }
  }
  if (solo) {
    rows[solo.row]!.push([solo.event])
    centres[solo.row]!.push(x(solo.event.axisYear))
  }
  return rows.map((groups, row) =>
    groups
      .map((members, i) => {
        const lane = lanes[row]!
        const n = members.length
        return {
          key: `${lane}:${members[0]!.id}`,
          lane,
          row,
          x: centres[row]![i]!,
          y: AXIS_H + row * ROW_H + ROW_H / 2,
          r: n > 1 ? Math.min(11, 7 + Math.log2(n) * 1.5) : 5.5,
          events: members,
        }
      })
      .sort((a, b) => a.x - b.x),
  )
}

function clusterDate(events: readonly HistoricalEvent[]): string {
  const first = events[0]
  const last = events[events.length - 1]
  if (!first || !last) return ''
  return first.axisYear === last.axisYear
    ? formatEventDate(first)
    : `${formatEventDate(first)} – ${formatEventDate(last)}`
}

function clusterLabel(cluster: Cluster, selected: boolean): string {
  const first = cluster.events[0]!
  const n = cluster.events.length
  const more = n > 1 ? `, and ${n - 1} more` : ''
  return `${n} event${n === 1 ? '' : 's'} near ${formatEventDate(first)}: ${first.title}${more}. ${laneMeta(cluster.lane).label}${selected ? '. Selected' : ''}`
}

export function HistoryTimeline({
  view,
  setRange,
  onSelectCluster,
}: {
  view: HistoryView
  setRange: HistoryActions['setRange']
  onSelectCluster: (ids: string[]) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<SVGGElement>(null)
  const drag = useRef<{ x: number; range: AxisRange; moved: boolean } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [activeKey, setActiveKey] = useState<string | null>(null)

  const plotW = Math.max(MIN_PLOT_W, useElementWidth(scrollRef))
  const { range, focus } = view.state
  const lanes = view.lanes
  const height = AXIS_H + lanes.length * ROW_H + BOTTOM_H
  const innerW = plotW - 2 * PAD
  const span = Math.max(1, range.end - range.start)
  const x = (axisYear: number) => PAD + ((axisYear - range.start) / span) * innerW

  const selectedId = view.selected && !view.selectedHidden ? view.selected.id : null
  const rows = useMemo(
    () =>
      buildClusters(
        view.visible,
        lanes,
        (a) => PAD + ((a - range.start) / Math.max(1, range.end - range.start)) * innerW,
        selectedId,
      ),
    [view.visible, lanes, range.start, range.end, innerW, selectedId],
  )
  const byKey = useMemo(() => new Map(rows.flat().map((c) => [c.key, c])), [rows])
  const ticks = calendarTicks(range.start, range.end, Math.max(4, Math.round(plotW / 110)))
  const selectedKey = selectedId
    ? (rows.flat().find((c) => c.events.some((e) => e.id === selectedId))?.key ?? null)
    : null
  const tabKey =
    activeKey && byKey.has(activeKey) ? activeKey : (selectedKey ?? rows.flat()[0]?.key ?? null)

  const markOf = (target: EventTarget | null): Cluster | null => {
    if (!(target instanceof Element)) return null
    const key = target.closest('[data-mark]')?.getAttribute('data-key')
    return key ? (byKey.get(key) ?? null) : null
  }

  const focusMark = (cluster: Cluster | undefined) => {
    if (!cluster) return
    setActiveKey(cluster.key)
    scrollRef.current?.querySelector<SVGGElement>(`[data-key="${cluster.key}"]`)?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const cluster = markOf(event.target)
    if (!cluster) return
    const lane = rows[cluster.row] ?? []
    const index = lane.findIndex((c) => c.key === cluster.key)
    const nearestIn = (row: number) =>
      rows[row]?.reduce<Cluster | undefined>(
        (best, c) => (!best || Math.abs(c.x - cluster.x) < Math.abs(best.x - cluster.x) ? c : best),
        undefined,
      )
    const step = (dir: 1 | -1) => {
      for (let row = cluster.row + dir; row >= 0 && row < rows.length; row += dir) {
        const found = nearestIn(row)
        if (found) return found
      }
      return undefined
    }
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        onSelectCluster(cluster.events.map((e) => e.id))
        return
      case 'ArrowRight':
        event.preventDefault()
        focusMark(lane[index + 1])
        return
      case 'ArrowLeft':
        event.preventDefault()
        focusMark(lane[index - 1])
        return
      case 'ArrowDown':
        event.preventDefault()
        focusMark(step(1))
        return
      case 'ArrowUp':
        event.preventDefault()
        focusMark(step(-1))
        return
      case 'Home':
        event.preventDefault()
        focusMark(lane[0])
        return
      case 'End':
        event.preventDefault()
        focusMark(lane[lane.length - 1])
        return
    }
  }

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || markOf(event.target)) return
    drag.current = { x: event.clientX, range, moved: false }
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Not supported (e.g. tests); dragging still works while the pointer stays inside.
    }
  }

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const state = drag.current
    if (!state) {
      const cluster = markOf(event.target)
      if ((cluster?.key ?? null) !== hoveredKey) setHoveredKey(cluster?.key ?? null)
      return
    }
    const dx = event.clientX - state.x
    if (!state.moved && Math.abs(dx) > DRAG_THRESHOLD) {
      state.moved = true
      setDragging(true)
      setHoveredKey(null)
    }
    if (state.moved) contentRef.current?.setAttribute('transform', `translate(${dx} 0)`)
  }

  const endDrag = (event: PointerEvent<SVGSVGElement>, commit: boolean) => {
    const state = drag.current
    if (!state) return
    drag.current = null
    contentRef.current?.removeAttribute('transform')
    setDragging(false)
    if (!commit || !state.moved) return
    const delta = -((event.clientX - state.x) / innerW) * (state.range.end - state.range.start)
    setRange(clampRange({ start: state.range.start + delta, end: state.range.end + delta }))
  }

  const hovered = hoveredKey ? byKey.get(hoveredKey) : undefined
  const focusX = x(focus)

  // On narrow screens the plot scrolls inside its box: keep the focus year in view.
  useEffect(() => {
    const el = scrollRef.current
    if (!el || el.scrollWidth <= el.clientWidth) return
    el.scrollLeft = Math.max(0, focusX - el.clientWidth / 2)
  }, [focusX])
  const focusInView = focus >= range.start && focus <= range.end
  const boundaryX = range.start <= 0 && range.end >= 1 ? x(0.5) : null
  const boundaryLabel = boundaryX !== null && ticks.every((t) => Math.abs(x(t) - boundaryX) > 48)
  const eraTitle = view.era.id === 'prehistoric' ? 'Prehistory' : `${view.era.label} history`

  return (
    <section aria-labelledby="timeline-heading" className={cn(PANEL, 'min-w-0 overflow-hidden')}>
      <div className="flex items-start justify-between gap-4 px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
        <div className="min-w-0">
          <Eyebrow>02 / Synchronised tracks</Eyebrow>
          <h2
            id="timeline-heading"
            className="mt-1.5 text-lg font-semibold tracking-tight sm:text-xl"
          >
            {eraTitle}, in parallel
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Shared date axis · {formatAxisYear(range.start)} to {formatAxisYear(range.end)} ·{' '}
            {lanes.length} region{lanes.length === 1 ? '' : 's'} visible
          </p>
        </div>
        <div className="shrink-0 text-right">
          <Eyebrow className="text-[0.62rem]">Focus year</Eyebrow>
          <p className="text-highlight mt-1 text-lg font-semibold tabular-nums sm:text-xl">
            {formatAxisYear(focus)}
          </p>
        </div>
      </div>

      <div className="border-line relative flex border-t">
        <div
          className="border-line w-[7.25rem] shrink-0 border-r sm:w-52"
          style={{ paddingTop: AXIS_H, paddingBottom: BOTTOM_H }}
        >
          {lanes.map((key, i) => {
            const lane = laneMeta(key)
            return (
              <div
                key={key}
                title={`${lane.label}: ${lane.tiny}`}
                className={cn(
                  'flex flex-col justify-center border-l-[3px] pr-2 pl-2.5',
                  i % 2 === 1 && 'bg-white/[0.02]',
                )}
                style={{ height: ROW_H, borderLeftColor: lane.color }}
              >
                <span className="line-clamp-2 text-[0.72rem] leading-tight font-medium sm:truncate sm:text-xs">
                  {lane.label}
                </span>
                <span className="text-faint hidden truncate text-[0.68rem] sm:block">
                  {lane.tiny}
                </span>
              </div>
            )
          })}
        </div>

        <div
          ref={scrollRef}
          className="relative min-w-0 flex-1 overflow-x-auto overscroll-x-contain"
        >
          <div className="relative" style={{ width: plotW }}>
            {/* Handlers are delegated from the role="button" marks inside (event delegation). */}
            {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions */}
            <svg
              width={plotW}
              height={height}
              viewBox={`0 0 ${plotW} ${height}`}
              aria-label={`Timeline from ${formatAxisYear(range.start)} to ${formatAxisYear(range.end)}. Arrow keys move between marks; Enter selects.`}
              className={cn('block select-none', dragging ? 'cursor-grabbing' : 'cursor-grab')}
              onKeyDown={onKeyDown}
              onClick={(event) => {
                const cluster = markOf(event.target)
                if (cluster) {
                  setActiveKey(cluster.key)
                  onSelectCluster(cluster.events.map((e) => e.id))
                }
              }}
              onFocus={(event: FocusEvent<SVGSVGElement>) => {
                const cluster = markOf(event.target)
                if (cluster) {
                  setActiveKey(cluster.key)
                  setHoveredKey(cluster.key)
                }
              }}
              onBlur={() => setHoveredKey(null)}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => endDrag(e, true)}
              onPointerCancel={(e) => endDrag(e, false)}
              onPointerLeave={() => {
                if (!drag.current) setHoveredKey(null)
              }}
            >
              <defs>
                <clipPath id="timeline-plot">
                  <rect x={0} y={0} width={plotW} height={height} />
                </clipPath>
              </defs>
              {lanes.map((key, i) => (
                <rect
                  key={key}
                  x={0}
                  y={AXIS_H + i * ROW_H}
                  width={plotW}
                  height={ROW_H}
                  fill={i % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent'}
                />
              ))}
              <g clipPath="url(#timeline-plot)">
                <g ref={contentRef}>
                  {ticks.map((t) => {
                    const tx = x(t)
                    const anchor = tx < 36 ? 'start' : tx > plotW - 36 ? 'end' : 'middle'
                    return (
                      <g key={t}>
                        <line
                          x1={tx}
                          x2={tx}
                          y1={AXIS_H - 6}
                          y2={height - BOTTOM_H}
                          stroke="#232b36"
                          strokeWidth={1}
                        />
                        <text
                          x={tx}
                          y={AXIS_H - 13}
                          textAnchor={anchor}
                          className="fill-muted-foreground font-mono text-[10.5px] tabular-nums"
                        >
                          {formatAxisYear(t)}
                        </text>
                      </g>
                    )
                  })}
                  {boundaryX !== null && (
                    <line
                      x1={boundaryX}
                      x2={boundaryX}
                      y1={AXIS_H - 6}
                      y2={height - BOTTOM_H}
                      stroke="#5b6473"
                      strokeWidth={1.5}
                      strokeDasharray="3 4"
                    >
                      <title>1 BCE is followed directly by 1 CE: there is no year 0</title>
                    </line>
                  )}
                  {boundaryX !== null && boundaryLabel && (
                    <text
                      x={boundaryX}
                      y={AXIS_H - 13}
                      textAnchor="middle"
                      className="fill-faint font-mono text-[10.5px]"
                    >
                      BCE | CE
                    </text>
                  )}
                  {focusInView && (
                    <line
                      x1={focusX}
                      x2={focusX}
                      y1={AXIS_H - 4}
                      y2={height - BOTTOM_H + 6}
                      stroke={HIGHLIGHT}
                      strokeOpacity={0.75}
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      pointerEvents="none"
                    />
                  )}
                  <MarkLayer rows={rows} selectedKey={selectedKey} tabKey={tabKey} />
                  {focusInView && (
                    <FocusLabel
                      x={focusX}
                      y={height - BOTTOM_H + 8}
                      plotW={plotW}
                      text={formatAxisYear(focus)}
                    />
                  )}
                </g>
              </g>
            </svg>
            {hovered && !dragging && <MarkTooltip cluster={hovered} plotW={plotW} />}
          </div>
        </div>

        {view.visible.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <output className="border-line-strong bg-surface-2/95 text-muted-foreground max-w-sm rounded-lg border px-4 py-3 text-center text-sm shadow-lg">
              No curated events match in this window. Try another era, clear the search, or add
              regions.
            </output>
          </div>
        )}
      </div>

      <div className="border-line text-muted-foreground flex flex-col gap-1 border-t px-4 py-3 text-[0.72rem] sm:flex-row sm:justify-between sm:px-5">
        <span>Dots are events or clusters of nearby events · click or press Enter to inspect</span>
        <span>Drag empty space to pan · arrow keys move between marks</span>
      </div>
    </section>
  )
}

function FocusLabel({ x, y, plotW, text }: { x: number; y: number; plotW: number; text: string }) {
  const w = text.length * 7 + 16
  const cx = Math.min(plotW - w / 2 - 2, Math.max(w / 2 + 2, x))
  return (
    <g pointerEvents="none">
      <rect x={cx - w / 2} y={y} width={w} height={20} rx={5} fill={HIGHLIGHT} />
      <text
        x={cx}
        y={y + 14}
        textAnchor="middle"
        className="font-mono text-[11px] font-semibold tabular-nums"
        fill="#0b0f14"
      >
        {text}
      </text>
    </g>
  )
}

/** Memoised so hovering (tooltip state) never re-renders every mark. */
const MarkLayer = memo(function MarkLayer({
  rows,
  selectedKey,
  tabKey,
}: {
  rows: Cluster[][]
  selectedKey: string | null
  tabKey: string | null
}) {
  return (
    <g>
      {/* The selected mark is drawn last so it sits on top of its neighbours. */}
      {rows
        .flat()
        .sort((a, b) => Number(a.key === selectedKey) - Number(b.key === selectedKey))
        .map((c) => {
          const selected = c.key === selectedKey
          const n = c.events.length
          const color = laneMeta(c.lane).color
          const r = selected ? c.r + 2 : c.r
          return (
            <g
              key={c.key}
              data-mark=""
              data-key={c.key}
              // SVG has no <button>: a focusable group with role="button" is the accessible equivalent.
              // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
              role="button"
              tabIndex={c.key === tabKey ? 0 : -1}
              aria-label={clusterLabel(c, selected)}
              className="group cursor-pointer outline-none"
            >
              <circle cx={c.x} cy={c.y} r={Math.max(r + 4, 12)} fill="transparent" />
              {selected && (
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={r + 5}
                  fill="none"
                  stroke={HIGHLIGHT}
                  strokeOpacity={0.4}
                  strokeWidth={1.5}
                />
              )}
              <circle
                cx={c.x}
                cy={c.y}
                r={r}
                fill={selected ? HIGHLIGHT : color}
                stroke={selected ? '#fff4d1' : CARD}
                strokeWidth={selected ? 2.5 : 1.5}
                className="group-hover:stroke-foreground"
              />
              {n > 1 && (
                <text
                  x={c.x}
                  y={c.y + 3.5}
                  textAnchor="middle"
                  fill="#0b0f14"
                  pointerEvents="none"
                  className="font-mono text-[10px] font-bold"
                >
                  {n > 9 ? '9+' : n}
                </text>
              )}
              <circle
                cx={c.x}
                cy={c.y}
                r={r + 4}
                fill="none"
                strokeWidth={2}
                className="stroke-lime opacity-0 group-focus-visible:opacity-100"
              />
            </g>
          )
        })}
    </g>
  )
})

function MarkTooltip({ cluster, plotW }: { cluster: Cluster; plotW: number }) {
  const lane = laneMeta(cluster.lane)
  const n = cluster.events.length
  const below = cluster.row === 0
  const left = Math.min(plotW - 130, Math.max(130, cluster.x))
  return (
    <div
      aria-hidden="true"
      className="border-line-strong bg-popover pointer-events-none absolute z-20 w-max max-w-64 rounded-lg border px-3 py-2 text-xs shadow-xl"
      style={{
        left,
        top: below ? cluster.y + cluster.r + 10 : cluster.y - cluster.r - 10,
        transform: below ? 'translateX(-50%)' : 'translate(-50%, -100%)',
      }}
    >
      <p className="text-muted-foreground flex items-center gap-1.5 font-mono text-[0.66rem] tracking-wide uppercase">
        <span className="size-2 rounded-full" style={{ backgroundColor: lane.color }} />
        {lane.label} · {clusterDate(cluster.events)}
        {n > 1 && ` · ${n} events`}
      </p>
      <ul className="mt-1 space-y-0.5 font-medium">
        {cluster.events.slice(0, 3).map((e) => (
          <li key={e.id}>{e.title}</li>
        ))}
      </ul>
      {n > 3 && <p className="text-muted-foreground mt-0.5">+{n - 3} more</p>}
    </div>
  )
}
