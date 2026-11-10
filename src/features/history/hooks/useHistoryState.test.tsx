import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'

import { makeEvent } from '@/test/fixtures'

import { useHistoryState } from './useHistoryState'

const rising = makeEvent({ id: 'rising', year: 1916, lane: 'Ireland', category: 'conflict' })
const somme = makeEvent({ id: 'somme', year: 1916, lane: 'Britain', category: 'conflict' })
const famine = makeEvent({ id: 'famine', year: 1845, lane: 'Ireland', category: 'crisis' })
const hastings = makeEvent({ id: 'hastings', year: 1066, lane: 'Britain', category: 'conflict' })
const newgrange = makeEvent({ id: 'newgrange', year: -3200, lane: 'Ireland', category: 'culture' })
const edo = makeEvent({ id: 'edo', year: 1603, lane: 'Asia', category: 'politics' })
const events = [newgrange, hastings, edo, famine, rising, somme]

function setup(initialQuery = '') {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[`/?${initialQuery}`]}>{children}</MemoryRouter>
  )
  return renderHook(() => useHistoryState(events), { wrapper })
}

describe('useHistoryState', () => {
  it('starts in the modern era with the core eight lanes and nothing selected', () => {
    const { result } = setup()
    const [view] = result.current
    expect(view.era.id).toBe('modern')
    expect(view.lanes).toHaveLength(8)
    expect(view.selected).toBeNull()
    expect(view.visible.map((e) => e.id)).toEqual(['famine', 'rising', 'somme'])
    expect(view.totalCount).toBe(6)
  })

  it('selects an event, travelling to its era and adding its lane when needed', () => {
    const { result } = setup()
    act(() => result.current[1].selectEvent('hastings'))
    expect(result.current[0].state).toMatchObject({
      era: 'medieval',
      focus: 1066,
      selectedEventId: 'hastings',
    })
    expect(result.current[0].lanes).toHaveLength(14)

    act(() => result.current[1].setEra('modern'))
    act(() => result.current[1].setLanes(['Ireland']))
    act(() => result.current[1].selectEvent('somme'))
    expect(result.current[0].lanes).toEqual(['Ireland', 'Britain'])
    expect(result.current[0].selected?.id).toBe('somme')
  })

  it('switching era resets the window and picks the nearest visible event', () => {
    const { result } = setup()
    act(() => result.current[1].setEra('prehistoric'))
    expect(result.current[0].state.range).toEqual({ start: -9999, end: -3000 })
    expect(result.current[0].selected?.id).toBe('newgrange')

    act(() => result.current[1].setEra('ancient'))
    expect(result.current[0].selected).toBeNull()
  })

  it('jumping to a year outside the window changes era', () => {
    const { result } = setup()
    act(() => result.current[1].jumpToYear(1603))
    expect(result.current[0].state).toMatchObject({
      era: 'early',
      focus: 1603,
      selectedEventId: 'edo',
    })
  })

  it('zooms around the focus and drops a selection that leaves the window', () => {
    const { result } = setup('event=famine')
    expect(result.current[0].state.focus).toBe(1845)
    act(() => result.current[1].zoomIn())
    const { range } = result.current[0].state
    expect(range.end - range.start).toBeLessThan(199)
    expect(range.start).toBeLessThanOrEqual(1845)
    expect(range.end).toBeGreaterThanOrEqual(1845)
    expect(result.current[0].selected?.id).toBe('famine')

    act(() => result.current[1].panLater())
    act(() => result.current[1].panLater())
    act(() => result.current[1].panLater())
    expect(result.current[0].state.range.start).toBeGreaterThan(1845)
    expect(result.current[0].selected).toBeNull()
  })

  it('keeps a hidden selection and flags it', () => {
    const { result } = setup('event=rising')
    act(() => result.current[1].setCategory('crisis'))
    expect(result.current[0].selected?.id).toBe('rising')
    expect(result.current[0].selectedHidden).toBe(true)
    expect(result.current[0].visible.map((e) => e.id)).toEqual(['famine'])

    act(() => result.current[1].setCategory('all'))
    expect(result.current[0].selectedHidden).toBe(false)
  })

  it('never lets the lane set go empty', () => {
    const { result } = setup()
    act(() => result.current[1].setLanes(['Ireland']))
    act(() => result.current[1].toggleLane('Ireland'))
    expect(result.current[0].lanes).toEqual(['Ireland'])
    act(() => result.current[1].selectAllLanes())
    expect(result.current[0].lanes).toHaveLength(14)
    act(() => result.current[1].selectCoreLanes())
    expect(result.current[0].lanes).toHaveLength(8)
  })

  it('counts matches across all time separately from the window', () => {
    const { result } = setup()
    act(() => result.current[1].setQuery('ireland'))
    expect(result.current[0].matchingCount).toBe(3)
    expect(result.current[0].visible).toHaveLength(2)
  })

  it('picks a search result and clears the query in one transition', () => {
    const { result } = setup('q=hastings')
    expect(result.current[0].visible).toHaveLength(0)
    act(() => result.current[1].selectEvent('hastings', { clearQuery: true }))
    expect(result.current[0].state).toMatchObject({
      era: 'medieval',
      query: '',
      selectedEventId: 'hastings',
    })
    expect(result.current[0].selectedHidden).toBe(false)
  })
})
