import { makeEvent } from '@/test/fixtures'

import { matchesFilters, matchesQuery, nearestEvent, searchEvents, visibleEvents } from './filters'

const rising = makeEvent({
  id: 'rising',
  year: 1916,
  lane: 'Ireland',
  category: 'conflict',
  title: 'Easter Rising',
  note: 'Rebels proclaim a republic.',
  wikipediaArticle: 'Easter Rising',
  displayYear: '1916 CE',
})
const somme = makeEvent({
  id: 'somme',
  year: 1916,
  lane: 'Britain',
  category: 'conflict',
  title: 'Battle of the Somme',
})
const newgrange = makeEvent({
  id: 'newgrange',
  year: -3200,
  lane: 'Ireland',
  category: 'culture',
  title: 'Newgrange constructed',
  displayYear: '3,200 BCE',
})
const all = [newgrange, rising, somme]

describe('matchesQuery', () => {
  it('is case-insensitive and searches title, note, lane, label, article and year text', () => {
    expect(matchesQuery(rising, 'EASTER')).toBe(true)
    expect(matchesQuery(rising, 'republic')).toBe(true)
    expect(matchesQuery(rising, 'ireland')).toBe(true)
    expect(matchesQuery(somme, 'england')).toBe(true) // lane label "Britain / England"
    expect(matchesQuery(rising, '1916')).toBe(true)
    expect(matchesQuery(newgrange, '3,200')).toBe(true)
    expect(matchesQuery(newgrange, '-3200')).toBe(true)
    expect(matchesQuery(rising, 'somme')).toBe(false)
  })

  it('matches everything on an empty query', () => {
    expect(matchesQuery(rising, '')).toBe(true)
    expect(matchesQuery(rising, '   ')).toBe(true)
  })
})

describe('matchesFilters / visibleEvents', () => {
  it('applies lanes, category and query together', () => {
    const filters = {
      lanes: new Set(['Ireland' as const]),
      category: 'conflict' as const,
      query: '',
    }
    expect(matchesFilters(rising, filters)).toBe(true)
    expect(matchesFilters(somme, filters)).toBe(false)
    expect(matchesFilters(newgrange, filters)).toBe(false)
  })

  it('restricts to the window', () => {
    const filters = {
      lanes: new Set(['Ireland' as const, 'Britain' as const]),
      category: 'all' as const,
      query: '',
    }
    expect(visibleEvents(all, filters, { start: 1800, end: 1999 }).map((e) => e.id)).toEqual([
      'rising',
      'somme',
    ])
    expect(visibleEvents(all, filters, { start: -9999, end: -3000 }).map((e) => e.id)).toEqual([
      'newgrange',
    ])
  })
})

describe('searchEvents', () => {
  it('searches the whole dataset and respects the limit', () => {
    expect(searchEvents(all, 'ireland').map((e) => e.id)).toEqual(['newgrange', 'rising'])
    expect(searchEvents(all, 'ireland', 1)).toHaveLength(1)
    expect(searchEvents(all, '')).toEqual([])
  })
})

describe('nearestEvent', () => {
  it('finds the closest on the axis, earlier on a tie, null when empty', () => {
    const a = makeEvent({ id: 'a', year: 1910 })
    const b = makeEvent({ id: 'b', year: 1920 })
    expect(nearestEvent([a, b], 1912)?.id).toBe('a')
    expect(nearestEvent([a, b], 1915)?.id).toBe('a')
    expect(nearestEvent([a, b], 1916)?.id).toBe('b')
    expect(nearestEvent([], 1916)).toBeNull()
  })
})
