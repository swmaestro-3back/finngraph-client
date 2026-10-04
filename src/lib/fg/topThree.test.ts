import { describe, expect, it } from 'vitest'
import type { CandleRes, ThemeStockRes } from '@/lib/apiTypes'
import {
  leaderReturns,
  returnRange,
  spreadBand,
  topThreeRows,
  topThreeSubtitle,
  topThreeTitle,
} from '@/lib/fg/topThree'

function stock(ticker: string, name: string, marketCap: number | null, price: number | null = 1000): ThemeStockRes {
  return { ticker, name, market: 'KOSPI', price, change: 1.5, tradingValue: 1, marketCap, reason: null }
}

function candles(rows: readonly [string, number][]): CandleRes[] {
  return rows.map(([date, close]) => ({ date, open: close, high: close, low: close, close, volume: 1 }))
}

describe('topThreeRows', () => {
  const theme = {
    marketCap: 1000,
    topStocks: [
      { ticker: 'A', name: '가' },
      { ticker: 'B', name: '나' },
      { ticker: 'C', name: '다' },
      { ticker: 'D', name: '라' },
    ],
  }

  it('topStocks 순서로 셋까지, 구성 종목의 시세·시가총액을 합치고 테마 시가총액으로 비중을 낸다', () => {
    const rows = topThreeRows(theme, [stock('C', '다', 100, 300), stock('A', '가', 500, 100), stock('B', '나', 200)])
    expect(rows.map((r) => r.ticker)).toEqual(['A', 'B', 'C'])
    expect(rows[0]).toMatchObject({ name: '가', market: 'KOSPI', price: 100, change: 1.5, marketCap: 500, weight: 50 })
    expect(rows[2].weight).toBe(10)
  })

  it('구성 종목이 아직 없으면 이름만 두고 나머지는 비운다', () => {
    const rows = topThreeRows(theme, null)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual({ ticker: 'A', name: '가', market: null, price: null, change: null, marketCap: null, weight: null })
  })

  it('테마 시가총액이 없으면 비중을 비운다', () => {
    const rows = topThreeRows({ ...theme, marketCap: null }, [stock('A', '가', 500)])
    expect(rows[0].weight).toBeNull()
  })
})

describe('topThreeTitle', () => {
  it('세 종목이면 3대장, 그보다 적으면 대장주다', () => {
    expect(topThreeTitle('정유', 3)).toBe('정유 3대장')
    expect(topThreeTitle('정유', 2)).toBe('정유 대장주')
    expect(topThreeTitle('정유', 1)).toBe('정유 대장주')
  })
})

describe('topThreeSubtitle', () => {
  const row = (weight: number | null) => ({ ticker: 'A', name: '가', market: null, price: null, change: null, marketCap: null, weight })

  it('종목 수와 비중 합을 쓴다', () => {
    expect(topThreeSubtitle([row(47.18), row(34.14), row(12.1)])).toBe('시가총액 상위 3종목 · 테마 시가총액의 93.4%')
  })

  it('비중을 모르는 종목이 있으면 비중 합을 빼고 쓴다', () => {
    expect(topThreeSubtitle([row(40), row(null)])).toBe('시가총액 상위 2종목')
  })
})

describe('leaderReturns', () => {
  const a = candles([
    ['2026-06-29', 100],
    ['2026-06-30', 100],
    ['2026-07-31', 110],
    ['2026-08-31', 120],
    ['2026-09-30', 150],
  ])
  const b = candles([
    ['2026-06-30', 200],
    ['2026-07-31', 180],
    ['2026-08-31', 220],
    ['2026-09-30', 210],
  ])

  it('기간 첫 거래일 종가를 0%로 맞춘다', () => {
    const chart = leaderReturns([a, b], 3)
    expect(chart?.dates).toEqual(['2026-06-30', '2026-07-31', '2026-08-31', '2026-09-30'])
    expect(chart?.series[0]?.points.map((p) => p.pct)).toEqual([0, 10, 20, 50])
    expect(chart?.series[1]?.periodReturn).toBeCloseTo(5)
  })

  it('짧은 기간은 그만큼 뒤에서 시작하고, 그날이 휴장이면 직전 거래일 종가가 기준이다', () => {
    const chart = leaderReturns([a, b], 1)
    expect(chart?.dates).toEqual(['2026-07-31', '2026-08-31', '2026-09-30'])
    expect(chart?.series[0]?.periodReturn).toBeCloseTo(36.3636, 3)
  })

  it('이력이 짧은 종목이 있으면 모두 그 종목의 첫날부터 견준다', () => {
    const late = candles([
      ['2026-08-31', 50],
      ['2026-09-30', 55],
    ])
    const chart = leaderReturns([a, late], 3)
    expect(chart?.dates[0]).toBe('2026-08-31')
    expect(chart?.series[0]?.periodReturn).toBeCloseTo(25)
  })

  it('시세가 없는 종목은 선을 비우고, 모두 없으면 null이다', () => {
    const chart = leaderReturns([a, null], 3)
    expect(chart?.series[1]).toBeNull()
    expect(leaderReturns([null, []], 3)).toBeNull()
  })
})

describe('spreadBand', () => {
  it('날짜마다 종목 수익률의 평균 ± 표준편차를 준다', () => {
    const chart = leaderReturns(
      [
        candles([
          ['2026-08-31', 100],
          ['2026-09-30', 120],
        ]),
        candles([
          ['2026-08-31', 100],
          ['2026-09-30', 100],
        ]),
      ],
      1,
    )
    expect(chart).not.toBeNull()
    const band = spreadBand(chart!)
    expect(band).toHaveLength(2)
    expect(band[0]).toEqual({ index: 0, upper: 0, lower: 0 })
    expect(band[1].upper).toBeCloseTo(20)
    expect(band[1].lower).toBeCloseTo(0)
  })

  it('한 종목만 있으면 밴드가 없다', () => {
    const chart = leaderReturns([candles([['2026-08-31', 100], ['2026-09-30', 120]])], 1)
    expect(spreadBand(chart!)).toEqual([])
  })

  it('시세가 빠진 날은 그 종목의 직전 값을 이어 쓴다', () => {
    const chart = leaderReturns(
      [
        candles([
          ['2026-08-28', 100],
          ['2026-08-31', 110],
          ['2026-09-30', 120],
        ]),
        candles([
          ['2026-08-28', 100],
          ['2026-09-30', 100],
        ]),
      ],
      1,
    )
    const band = spreadBand(chart!)
    expect(band.map((b) => b.index)).toEqual([0, 1, 2])
    expect(band[1].upper).toBeCloseTo(10)
    expect(band[1].lower).toBeCloseTo(0)
  })
})

describe('returnRange', () => {
  it('선과 밴드, 0을 모두 담는다', () => {
    expect(returnRange({ min: 5, max: 30 }, [{ index: 0, upper: 35, lower: 2 }])).toEqual({ min: 0, max: 35 })
    expect(returnRange({ min: -12, max: -3 }, [])).toEqual({ min: -12, max: 0 })
  })
})
