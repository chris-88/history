import { makeEvent } from '@/test/fixtures'

import type { HistoryState } from '../types'
import { parseUrlState, serializeUrlState } from './urlState'

const rising = makeEvent({ id: 'evt_rising', year: 1916, lane: 'Ireland' })
const newgrange = makeEvent({ id: 'evt_newgrange', year: -3200, lane: 'Ireland' })
const byId = new Map([rising, newgrange].map((e) => [e.id, e]))

const parse = (query: string) => parseUrlState(new URLSearchParams(query), byId)

describe('parseUrlState', () => {
  it('defaults to the modern era focused on 1916 with no selection', () => {
    expect(parse('')).toEqual<HistoryState>({
      era: 'modern',
      range: { start: 1800, end: 1999 },
      focus: 1916,
      selectedEventId: null,
      lanes: null,
      category: 'all',
      query: '',
    })
  })

  it('derives era and focus from a selected event', () => {
    const state = parse('event=evt_newgrange')
    expect(state).toMatchObject({
      era: 'prehistoric',
      range: { start: -9999, end: -3000 },
      focus: -3199,
      selectedEventId: 'evt_newgrange',
    })
  })

  it('derives the era from a year when no era is given', () => {
    expect(parse('year=1066')).toMatchObject({
      era: 'medieval',
      focus: 1066,
      range: { start: 500, end: 1499 },
    })
    expect(parse('year=-500')).toMatchObject({ era: 'classical', focus: -499 })
  })

  it('ignores unknown events, bad years, bad eras and year 0', () => {
    expect(parse('event=nope').selectedEventId).toBeNull()
    expect(parse('year=0').focus).toBe(1916)
    expect(parse('year=abc').focus).toBe(1916)
    expect(parse('year=2500').focus).toBe(1916)
    expect(parse('era=future').era).toBe('modern')
  })

  it('restores a custom window and clamps the focus into it', () => {
    const state = parse('era=modern&from=1900&to=1950&year=1990')
    expect(state.range).toEqual({ start: 1900, end: 1950 })
    expect(state.focus).toBe(1950)
  })

  it('ignores an inverted or partial window', () => {
    expect(parse('from=1950&to=1900').range).toEqual({ start: 1800, end: 1999 })
    expect(parse('from=1950').range).toEqual({ start: 1800, end: 1999 })
  })

  it('keeps only known lanes, in display order, and falls back to the default', () => {
    expect(parse('lanes=China,Ireland,Narnia').lanes).toEqual(['Ireland', 'China'])
    expect(parse('lanes=Narnia').lanes).toBeNull()
  })

  it('parses category and query', () => {
    expect(parse('cat=conflict&q=%20rising%20')).toMatchObject({
      category: 'conflict',
      query: 'rising',
    })
    expect(parse('cat=sport').category).toBe('all')
  })
})

describe('serializeUrlState', () => {
  it('writes nothing for the default state', () => {
    expect(serializeUrlState(parse('')).toString()).toBe('')
  })

  it('round-trips a full state', () => {
    const query =
      'era=classical&event=evt_rising&from=1&to=400&lanes=Ireland%2CMediterranean&cat=politics&q=rome'
    const state = parse(query)
    expect(parseUrlState(serializeUrlState(state), byId)).toEqual(state)
  })

  it('prefers the event over the year and omits the year at the era focus', () => {
    expect(
      serializeUrlState({ ...parse(''), selectedEventId: 'evt_rising', focus: 1916 }).toString(),
    ).toBe('event=evt_rising')
    expect(serializeUrlState({ ...parse(''), focus: 1922 }).toString()).toBe('year=1922')
    expect(serializeUrlState({ ...parse(''), focus: 1916 }).toString()).toBe('')
  })

  it('writes BCE years as negatives without a year 0', () => {
    const state = parse('era=classical&year=-1')
    expect(serializeUrlState(state).get('year')).toBe('-1')
    expect(serializeUrlState({ ...state, focus: 0 }).get('year')).toBe('-1')
    expect(serializeUrlState({ ...state, focus: 1 }).get('year')).toBe('1')
  })
})
