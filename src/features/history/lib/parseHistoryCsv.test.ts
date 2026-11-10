import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { csv, csvRow } from '@/test/fixtures'

import { parseHistoryCsv } from './parseHistoryCsv'

const REAL_CSV = readFileSync(
  resolve(__dirname, '../../../../public/data/history-events.csv'),
  'utf8',
)

describe('the shipped dataset', () => {
  const result = parseHistoryCsv(REAL_CSV)

  it('parses with no issues', () => {
    if (!result.ok) {
      throw new Error(result.issues.map((i) => `line ${i.line}: ${i.message}`).join('\n'))
    }
    expect(result.events).toHaveLength(647)
  })

  it('has unique ids, no year 0 and a Wikipedia URL on every row', () => {
    if (!result.ok) throw new Error('parse failed')
    const ids = new Set(result.events.map((e) => e.id))
    expect(ids.size).toBe(647)
    expect(result.events.every((e) => e.year !== 0)).toBe(true)
    expect(
      result.events.every((e) => e.wikipediaUrl.startsWith('https://en.wikipedia.org/wiki/')),
    ).toBe(true)
  })

  it('is sorted by axis year', () => {
    if (!result.ok) throw new Error('parse failed')
    for (let i = 1; i < result.events.length; i++) {
      expect(result.events[i]!.axisYear).toBeGreaterThanOrEqual(result.events[i - 1]!.axisYear)
    }
  })

  it('keeps the Easter Rising in Ireland, 1916', () => {
    if (!result.ok) throw new Error('parse failed')
    const rising = result.events.find((e) => e.title === 'Easter Rising')
    expect(rising).toMatchObject({
      year: 1916,
      lane: 'Ireland',
      category: 'conflict',
      approximate: false,
    })
  })
})

describe('parseHistoryCsv', () => {
  it('keeps quoted titles and notes with commas and non-ASCII text intact', () => {
    const text = csv(
      csvRow({
        event_id: 'evt_q',
        title: '"Göbekli Tepe, monumental complex"',
        note: '"Enclosures appear in what is now Turkey, near Şanlıurfa."',
        display_year: '"9,600 BCE"',
        year: '-9600',
        approx: 'True',
      }),
    )
    const result = parseHistoryCsv(text)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.events[0]).toMatchObject({
      title: 'Göbekli Tepe, monumental complex',
      note: 'Enclosures appear in what is now Turkey, near Şanlıurfa.',
      displayYear: '9,600 BCE',
      year: -9600,
      axisYear: -9599,
      approximate: true,
    })
  })

  it('parses approx case-insensitively and rejects other values', () => {
    expect(parseHistoryCsv(csv(csvRow({ approx: 'true' }))).ok).toBe(true)
    expect(parseHistoryCsv(csv(csvRow({ approx: 'FALSE' }))).ok).toBe(true)
    const bad = parseHistoryCsv(csv(csvRow({ approx: 'yes' })))
    expect(bad.ok).toBe(false)
    if (bad.ok) return
    expect(bad.issues[0]).toMatchObject({ line: 2 })
    expect(bad.issues[0]!.message).toMatch(/approx/)
  })

  it('reports the line number of a bad row', () => {
    const result = parseHistoryCsv(csv(csvRow(), csvRow({ event_id: 'evt_b', year: '0' })))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues).toEqual([{ line: 3, message: expect.stringMatching(/year/) }])
  })

  it.each([
    ['year below range', { year: '-10001' }],
    ['year above range', { year: '2000' }],
    ['non-integer year', { year: '19.5' }],
    ['unknown lane', { lane: 'Atlantis' }],
    ['unknown category', { cat: 'sport' }],
    ['unknown source', { source: 'llm' }],
    ['empty title', { title: '' }],
    ['empty note', { note: '' }],
    ['http URL', { wikipedia_url: 'http://en.wikipedia.org/wiki/X' }],
    ['other host', { wikipedia_url: 'https://example.com/wiki/X' }],
    ['not a URL', { wikipedia_url: 'Easter Rising' }],
  ])('rejects %s', (_label, fields) => {
    expect(parseHistoryCsv(csv(csvRow(fields))).ok).toBe(false)
  })

  it('rejects duplicate event ids', () => {
    const result = parseHistoryCsv(csv(csvRow(), csvRow({ title: 'Again' })))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues[0]!.message).toMatch(/duplicate event_id "evt_a"/)
  })

  it('does not deduplicate rows that share a year, lane or article', () => {
    const result = parseHistoryCsv(
      csv(csvRow(), csvRow({ event_id: 'evt_b', title: 'Proclamation read' })),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.events).toHaveLength(2)
  })

  it('reports missing columns', () => {
    const result = parseHistoryCsv('event_id,year\nevt_a,1916\n')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues[0]).toMatchObject({
      line: 1,
      message: expect.stringMatching(/missing columns/),
    })
  })

  it('sorts across the BCE/CE boundary and keeps file order within a year', () => {
    const result = parseHistoryCsv(
      csv(
        csvRow({ event_id: 'a', year: '1' }),
        csvRow({ event_id: 'b', year: '-1' }),
        csvRow({ event_id: 'c', year: '-1' }),
        csvRow({ event_id: 'd', year: '-2' }),
      ),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.events.map((e) => e.id)).toEqual(['d', 'b', 'c', 'a'])
  })
})
