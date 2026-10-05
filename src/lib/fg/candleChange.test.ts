import { describe, expect, it } from 'vitest'
import type { CandleRes } from '@/lib/apiTypes'
import { candleChangeAt } from '@/lib/fg/candleChange'

function bar(date: string, close: number, changeRate?: number | null): CandleRes {
  const candle: CandleRes = { date, open: close, high: close, low: close, close, volume: 1000 }
  return changeRate === undefined ? candle : { ...candle, changeRate }
}

describe('candleChangeAt', () => {
  it('API 등락률이 있으면 직전 봉과 달라도 그 값을 쓴다', () => {
    const candles = [bar('2026-09-30', 212_800, 0.5), bar('2026-10-01', 212_000, -0.2353)]
    expect(candleChangeAt(candles, 1)).toBe(-0.2353)
  })

  it('API 등락률이 0이면 0이다', () => {
    const candles = [bar('2026-09-30', 10_000, null), bar('2026-10-01', 10_100, 0)]
    expect(candleChangeAt(candles, 1)).toBe(0)
  })

  it('API 등락률이 없으면 직전 봉 종가로 계산한다', () => {
    const candles = [bar('2026-09-30', 10_000), bar('2026-10-01', 10_250)]
    expect(candleChangeAt(candles, 1)).toBeCloseTo(2.5, 10)
  })

  it('API 등락률이 null이면 직전 봉 종가로 계산한다', () => {
    const candles = [bar('2026-09-30', 10_000, null), bar('2026-10-01', 9_800, null)]
    expect(candleChangeAt(candles, 1)).toBeCloseTo(-2, 10)
  })

  it('첫 봉은 API 등락률이 있으면 그 값, 없으면 null이다', () => {
    expect(candleChangeAt([bar('2026-10-01', 10_000, 1.25)], 0)).toBe(1.25)
    expect(candleChangeAt([bar('2026-10-01', 10_000)], 0)).toBeNull()
    expect(candleChangeAt([bar('2026-10-01', 10_000, null)], 0)).toBeNull()
  })

  it('직전 종가가 0 이하이거나 범위 밖이면 null이다', () => {
    expect(candleChangeAt([bar('2026-09-30', 0), bar('2026-10-01', 10_000)], 1)).toBeNull()
    expect(candleChangeAt([bar('2026-10-01', 10_000, 1)], 3)).toBeNull()
    expect(candleChangeAt([], 0)).toBeNull()
  })
})
