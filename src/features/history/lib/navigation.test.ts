import { DATASET, MIN_RANGE_SPAN } from '../historyConfig'
import { clampRange, clampYear, panRange, rangeContains, zoomRange } from './navigation'

describe('clampRange', () => {
  it('keeps the width when sliding back inside the dataset', () => {
    expect(clampRange({ start: -10500, end: -9500 })).toEqual({ start: -9999, end: -8999 })
    expect(clampRange({ start: 1900, end: 2100 })).toEqual({ start: 1799, end: 1999 })
  })

  it('never exceeds the dataset', () => {
    expect(clampRange({ start: -20000, end: 5000 })).toEqual({
      start: DATASET.axisMin,
      end: DATASET.axisMax,
    })
  })

  it('enforces the minimum span', () => {
    const r = clampRange({ start: 1916, end: 1916 })
    expect(r.end - r.start).toBe(MIN_RANGE_SPAN)
  })
})

describe('zoomRange', () => {
  it('zooms in around the pivot', () => {
    const r = zoomRange({ start: 1800, end: 1999 }, 1916, 0.5)
    expect(r.end - r.start).toBeCloseTo(100, -1)
    expect(rangeContains(r, 1916)).toBe(true)
  })

  it('zooms out but stays inside the dataset', () => {
    const r = zoomRange({ start: 1800, end: 1999 }, 1916, 10)
    expect(r.end).toBe(DATASET.axisMax)
    expect(r.start).toBeGreaterThanOrEqual(DATASET.axisMin)
  })
})

describe('panRange', () => {
  it('slides by a fraction of the width and stops at the edges', () => {
    expect(panRange({ start: 1800, end: 1900 }, 0.5)).toEqual({ start: 1850, end: 1950 })
    expect(panRange({ start: 1800, end: 1900 }, 2)).toEqual({ start: 1899, end: 1999 })
    expect(panRange({ start: -9999, end: -9000 }, -1)).toEqual({ start: -9999, end: -9000 })
  })
})

describe('clampYear', () => {
  it('clamps to the dataset by default and to a range when given', () => {
    expect(clampYear(5000)).toBe(1999)
    expect(clampYear(-20000)).toBe(-9999)
    expect(clampYear(1700, { start: 1800, end: 1999 })).toBe(1800)
  })
})
