import { describe, expect, it } from 'vitest'
import type { CandleRes } from '@/lib/apiTypes'
import { priceRange } from '@/lib/priceRange'

const candle = (low: number, high: number, close: number): CandleRes => ({
  date: '2026-01-05',
  open: close,
  high,
  low,
  close,
  volume: 0,
})

describe('priceRange', () => {
  it('캔들 고·저와 현재가 위치·등락을 구한다', () => {
    const r = priceRange([candle(100, 150, 120), candle(80, 200, 150)], 140)
    expect(r).toMatchObject({ low: 80, high: 200, price: 140 })
    expect(r?.position).toBeCloseTo(0.5)
    expect(r?.fromLow).toBeCloseTo(75)
    expect(r?.fromHigh).toBeCloseTo(-30)
  })

  it('현재가가 범위를 벗어나면 범위를 넓혀 막대 안에 둔다', () => {
    const r = priceRange([candle(100, 150, 120)], 160)
    expect(r).toMatchObject({ high: 160, position: 1, fromHigh: 0 })
  })

  it('현재가가 없으면 마지막 종가를 쓴다', () => {
    expect(priceRange([candle(100, 150, 120), candle(90, 130, 110)], null)?.price).toBe(110)
  })

  it('고·저가 같으면 가운데에 둔다', () => {
    expect(priceRange([candle(100, 100, 100)], 100)?.position).toBe(0.5)
  })

  it('캔들이 없으면 null', () => {
    expect(priceRange([], 100)).toBeNull()
  })
})
