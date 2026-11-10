import {
  axisTicks,
  calendarTicks,
  formatAxisYear,
  formatEventDate,
  formatYear,
  fromAxisYear,
  isValidYear,
  niceStep,
  toAxisYear,
} from './chronology'

describe('toAxisYear / fromAxisYear', () => {
  it('makes 1 BCE and 1 CE adjacent', () => {
    expect(toAxisYear(-1)).toBe(0)
    expect(toAxisYear(1)).toBe(1)
    expect(toAxisYear(1) - toAxisYear(-1)).toBe(1)
  })

  it('shifts BCE years by one and leaves CE years alone', () => {
    expect(toAxisYear(-500)).toBe(-499)
    expect(toAxisYear(-10000)).toBe(-9999)
    expect(toAxisYear(1916)).toBe(1916)
  })

  it('round-trips every year in the dataset bounds', () => {
    for (let y = -10000; y <= 1999; y++) {
      if (y === 0) continue
      expect(fromAxisYear(toAxisYear(y))).toBe(y)
    }
  })

  it('never produces year 0', () => {
    expect(fromAxisYear(0)).toBe(-1)
    expect(fromAxisYear(-1)).toBe(-2)
    expect(() => toAxisYear(0)).toThrow(RangeError)
  })
})

describe('formatYear', () => {
  it('labels BCE and CE', () => {
    expect(formatYear(-500)).toBe('500 BCE')
    expect(formatYear(1066)).toBe('1066 CE')
    expect(formatYear(1066, { grouped: true })).toBe('1,066 CE')
    expect(formatYear(-10000)).toBe('10,000 BCE')
    expect(formatYear(-9600)).toBe('9,600 BCE')
    expect(formatYear(-9600, { grouped: false })).toBe('9600 BCE')
  })

  it('can drop the CE suffix but never the BCE one', () => {
    expect(formatYear(1916, { era: false })).toBe('1916')
    expect(formatYear(-44, { era: false })).toBe('44 BCE')
  })

  it('formats axis coordinates through the inverse', () => {
    expect(formatAxisYear(0)).toBe('1 BCE')
    expect(formatAxisYear(1)).toBe('1 CE')
  })

  it('refuses year 0', () => {
    expect(() => formatYear(0)).toThrow(RangeError)
  })
})

describe('formatEventDate', () => {
  it('prefixes c. only for approximate dates', () => {
    expect(formatEventDate({ displayYear: '3,200 BCE', approximate: true })).toBe('c. 3,200 BCE')
    expect(formatEventDate({ displayYear: '1916 CE', approximate: false })).toBe('1916 CE')
  })
})

describe('isValidYear', () => {
  it.each([
    [-10000, true],
    [-1, true],
    [1, true],
    [1999, true],
    [0, false],
    [-10001, false],
    [2000, false],
    [1.5, false],
    [Number.NaN, false],
  ])('%s -> %s', (year, valid) => {
    expect(isValidYear(year)).toBe(valid)
  })
})

describe('ticks', () => {
  it('picks 1-2-5 steps', () => {
    expect(niceStep(200)).toBe(20)
    expect(niceStep(12000)).toBe(2000)
    expect(niceStep(5)).toBe(1)
    expect(niceStep(45)).toBe(5)
  })

  it('produces ticks inside the range', () => {
    const ticks = axisTicks(1800, 1999)
    expect(ticks[0]).toBe(1800)
    expect(ticks.at(-1)).toBe(1980)
    expect(ticks).toHaveLength(10)
  })

  it('crosses the BCE/CE boundary without a 0 label', () => {
    const labels = axisTicks(-499, 499).map((t) => formatAxisYear(t))
    expect(labels).toContain('1 BCE')
    expect(labels).not.toContain('0 CE')
    expect(labels).not.toContain('0 BCE')
  })
})

describe('calendarTicks', () => {
  it('ticks round calendar years on both sides of the boundary, never year 0', () => {
    const labels = calendarTicks(toAxisYear(-500), toAxisYear(499)).map((t) => formatAxisYear(t))
    expect(labels).toContain('500 BCE')
    expect(labels).toContain('100 BCE')
    expect(labels).toContain('100 CE')
    expect(labels).not.toContain('401 BCE')
    expect(labels.join(' ')).not.toMatch(/\b0 (BCE|CE)/)
  })

  it('keeps 1 BCE and 1 CE adjacent at a one-year step', () => {
    const labels = calendarTicks(toAxisYear(-3), toAxisYear(3)).map((t) => formatAxisYear(t))
    expect(labels).toEqual(['3 BCE', '2 BCE', '1 BCE', '1 CE', '2 CE', '3 CE'])
  })

  it('stays inside the window at the dataset ends', () => {
    const ticks = calendarTicks(toAxisYear(-10000), toAxisYear(1999))
    expect(ticks[0]).toBeGreaterThanOrEqual(toAxisYear(-10000))
    expect(ticks.at(-1)).toBeLessThanOrEqual(1999)
  })
})
