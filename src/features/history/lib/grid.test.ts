import { toAxisYear } from './chronology'
import { gridBuckets, gridScaleLabel, gridStepForYear } from './grid'

describe('gridStepForYear', () => {
  it.each([
    [1916, 1],
    [1800, 1],
    [1799, 5],
    [1500, 5],
    [1499, 20],
    [500, 20],
    [499, 50],
    [1, 50],
    [-1, 50],
    [-500, 50],
    [-501, 200],
    [-3000, 200],
    [-3001, 500],
    [-10000, 500],
  ])('%s -> %s years', (year, step) => {
    expect(gridStepForYear(year)).toBe(step)
  })
})

describe('gridBuckets', () => {
  it('centres nine single years on the focus', () => {
    const buckets = gridBuckets(1916, 1)
    expect(buckets).toHaveLength(9)
    expect(buckets[0]!.label).toBe('1912 CE')
    expect(buckets[4]).toMatchObject({ label: '1916 CE', isFocus: true })
    expect(buckets.filter((b) => b.isFocus)).toHaveLength(1)
  })

  it('never shows a year 0 across the boundary', () => {
    const labels = gridBuckets(0, 50).map((b) => b.label)
    expect(labels).toContain('50 – 1 BCE')
    expect(labels).toContain('1 – 49 CE')
    expect(labels).toContain('100 – 51 BCE')
    expect(labels).toContain('50 – 99 CE')
    expect(labels.join(' ')).not.toMatch(/\b0 (BCE|CE)/)
  })

  it('clamps at the dataset ends', () => {
    const first = gridBuckets(-9999, 500)
    expect(first[0]).toMatchObject({
      start: -9999,
      startYear: -10000,
      endYear: -9501,
      label: '10,000 – 9,501 BCE',
    })
    expect(first.length).toBeLessThan(9)

    const last = gridBuckets(1999, 1)
    expect(last.at(-1)).toMatchObject({ start: 1999, end: 1999, isFocus: true })
    expect(last).toHaveLength(5)
  })

  it('aligns to round years in every era', () => {
    expect(gridBuckets(1066, 20)[4]).toMatchObject({
      startYear: 1060,
      endYear: 1079,
      label: '1060 – 1079 CE',
      isFocus: true,
    })
    expect(gridBuckets(toAxisYear(-1600), 200)[4]).toMatchObject({
      startYear: -1600,
      endYear: -1401,
      label: '1,600 – 1,401 BCE',
      isFocus: true,
    })
    expect(gridBuckets(1649, 5)[4]).toMatchObject({ startYear: 1645, endYear: 1649, isFocus: true })
  })

  it('labels scales', () => {
    expect(gridScaleLabel(1)).toBe('Year by year')
    expect(gridScaleLabel(200)).toBe('Groups of 200 years')
  })
})
