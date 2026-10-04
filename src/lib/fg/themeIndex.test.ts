import { describe, expect, it } from 'vitest'
import {
  formatIndexValue,
  indexWindow,
  streakLabel,
  week52Dates,
  week52Label,
  windowMove,
} from '@/lib/fg/themeIndex'

const closes = (rows: readonly [string, number][]) => rows.map(([date, close]) => ({ date, close }))

describe('indexWindow', () => {
  const candles = closes([
    ['2026-06-29', 90],
    ['2026-06-30', 100],
    ['2026-07-31', 120],
    ['2026-09-29', 118],
    ['2026-09-30', 125],
  ])

  it('기간 시작 기준 종가부터 마지막 날까지 자른다', () => {
    expect(indexWindow(candles, 3).map((c) => c.date)).toEqual(['2026-06-30', '2026-07-31', '2026-09-29', '2026-09-30'])
    expect(indexWindow(candles, 1).map((c) => c.date)).toEqual(['2026-07-31', '2026-09-29', '2026-09-30'])
  })

  it('기간 등락률은 첫 종가 대비 마지막 종가다', () => {
    expect(windowMove(indexWindow(candles, 3))).toBeCloseTo(25)
    expect(windowMove([])).toBeNull()
    expect(windowMove(closes([['2026-09-30', 0], ['2026-10-01', 1]]))).toBeNull()
  })
})

describe('week52Dates', () => {
  const index = { date: '2026-09-30', high52w: 150, low52w: 80 }

  it('지난 1년 종가에서 최고·최저가 나온 날을 찾는다', () => {
    const candles = closes([
      ['2025-09-29', 60],
      ['2025-09-30', 70],
      ['2025-10-01', 80],
      ['2026-03-02', 150],
      ['2026-09-30', 140],
    ])
    expect(week52Dates(candles, index, false)).toEqual({ high: '2026-03-02', low: '2025-10-01' })
  })

  it('받은 캔들이 1년을 다 덮지 못하면 날짜를 지어내지 않는다', () => {
    const candles = closes([
      ['2025-11-03', 80],
      ['2026-03-02', 150],
      ['2026-09-30', 140],
    ])
    expect(week52Dates(candles, index, false)).toBeNull()
  })

  it('지수 이력 전체를 받았으면 1년보다 짧아도 찾는다', () => {
    const candles = closes([
      ['2025-11-03', 80],
      ['2026-03-02', 150],
      ['2026-09-30', 140],
    ])
    expect(week52Dates(candles, index, true)).toEqual({ high: '2026-03-02', low: '2025-11-03' })
  })

  it('값이 응답과 다르면 날짜를 비운다', () => {
    const candles = closes([
      ['2025-09-30', 70],
      ['2025-10-01', 81],
      ['2026-03-02', 150],
    ])
    expect(week52Dates(candles, index, false)).toBeNull()
  })

  it('같은 값이 여러 번이면 가장 최근 날이다', () => {
    const candles = closes([
      ['2025-09-30', 70],
      ['2025-10-01', 80],
      ['2026-03-02', 150],
      ['2026-05-04', 150],
      ['2026-09-30', 140],
    ])
    expect(week52Dates(candles, index, false)?.high).toBe('2026-05-04')
  })
})

describe('streakLabel', () => {
  it('이틀 이상 이어질 때만 쓴다', () => {
    expect(streakLabel(3)).toBe('3일 연속 상승')
    expect(streakLabel(-2)).toBe('2일 연속 하락')
    expect(streakLabel(1)).toBeNull()
    expect(streakLabel(-1)).toBeNull()
    expect(streakLabel(0)).toBeNull()
  })
})

describe('지수 문구', () => {
  it('지수 값은 소수 둘째 자리까지 쉼표를 넣는다', () => {
    expect(formatIndexValue(1427.9572)).toBe('1,427.96')
    expect(formatIndexValue(647.4)).toBe('647.40')
  })

  it('52주 문구는 날짜가 있으면 괄호로 붙인다', () => {
    const index = { date: '2026-09-30', high52w: 1516.2445, low52w: 647.4835 }
    expect(week52Label(index, { high: '2026-09-09', low: '2025-10-02' })).toBe(
      '52주 최저 647.48(2025년 10월 2일) · 최고 1,516.24(9월 9일)',
    )
    expect(week52Label(index, null)).toBe('52주 최저 647.48 · 최고 1,516.24')
  })
})
