import { describe, expect, it } from 'vitest'
import { gapFromHigh, week52Position } from '@/lib/fg/week52'

describe('week52Position', () => {
  it('최저~최고 사이 위치를 0~1로', () => {
    expect(week52Position({ price: 72400, high: 74900, low: 38200 })).toBeCloseTo(0.9319, 4)
  })

  it('범위를 벗어나면 끝에 붙인다', () => {
    expect(week52Position({ price: 80000, high: 74900, low: 38200 })).toBe(1)
    expect(week52Position({ price: 30000, high: 74900, low: 38200 })).toBe(0)
  })

  it('최고와 최저가 같으면 막대를 그리지 않는다', () => {
    expect(week52Position({ price: 1000, high: 1000, low: 1000 })).toBeNull()
  })
})

describe('gapFromHigh', () => {
  it('현재가가 최고가보다 몇 % 낮은지', () => {
    expect(gapFromHigh(72400, 74900)).toBeCloseTo(-3.3378, 4)
    expect(gapFromHigh(23150, 23150)).toBe(0)
  })

  it('최고가가 0 이하면 0', () => {
    expect(gapFromHigh(100, 0)).toBe(0)
  })
})
