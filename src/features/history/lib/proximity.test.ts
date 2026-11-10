import { makeEvent } from '@/test/fixtures'

import { nearbyEvents, proximityTolerance, sameYearSiblings } from './proximity'

describe('proximityTolerance', () => {
  it('widens for older periods', () => {
    expect(proximityTolerance(1916)).toBe(3)
    expect(proximityTolerance(1649)).toBe(18)
    expect(proximityTolerance(1066)).toBe(40)
    expect(proximityTolerance(43)).toBe(70)
    expect(proximityTolerance(-1600)).toBe(220)
    expect(proximityTolerance(-7000)).toBe(600)
  })
})

describe('nearbyEvents', () => {
  const rising = makeEvent({ id: 'rising', year: 1916, lane: 'Ireland' })
  const lockout = makeEvent({ id: 'lockout', year: 1913, lane: 'Ireland' })
  const somme = makeEvent({ id: 'somme', year: 1916, lane: 'Britain' })
  const verdun = makeEvent({ id: 'verdun', year: 1916, lane: 'France' })
  const revolution = makeEvent({ id: 'revolution', year: 1917, lane: 'Russia' })
  const ww1 = makeEvent({ id: 'ww1', year: 1914, lane: 'Germany' })
  const armistice = makeEvent({ id: 'armistice', year: 1918, lane: 'Germany' })
  const weimar = makeEvent({ id: 'weimar', year: 1919, lane: 'Germany' })
  const old = makeEvent({ id: 'old', year: 1900, lane: 'USA' })
  const all = [old, lockout, ww1, rising, somme, verdun, revolution, armistice, weimar]

  it('returns other regions only, nearest first, lanes in display order on a tie', () => {
    expect(nearbyEvents(all, rising).map((e) => e.id)).toEqual([
      'somme',
      'verdun',
      'revolution',
      'ww1',
      'armistice',
    ])
  })

  it('respects the limit and the tolerance', () => {
    expect(nearbyEvents(all, rising, 2).map((e) => e.id)).toEqual(['somme', 'verdun'])
    expect(nearbyEvents(all, rising).map((e) => e.id)).not.toContain('old')
    expect(nearbyEvents(all, rising).map((e) => e.id)).not.toContain('lockout')
  })

  it('measures distance across the BCE/CE boundary on the axis', () => {
    const a = makeEvent({ id: 'a', year: -1, lane: 'Mediterranean' })
    const b = makeEvent({ id: 'b', year: 1, lane: 'Middle East' })
    expect(nearbyEvents([a, b], a).map((e) => e.id)).toEqual(['b'])
  })
})

describe('sameYearSiblings', () => {
  it('finds events sharing a lane and year', () => {
    const a = makeEvent({ id: 'a', year: 1919, lane: 'Ireland' })
    const b = makeEvent({ id: 'b', year: 1919, lane: 'Ireland' })
    const c = makeEvent({ id: 'c', year: 1919, lane: 'Britain' })
    expect(sameYearSiblings([a, b, c], a).map((e) => e.id)).toEqual(['b'])
  })
})
