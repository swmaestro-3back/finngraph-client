import { describe, expect, it } from 'vitest'
import { rangeZone, rankPosition } from '@/lib/rangeZone'

describe('rangeZone', () => {
  it('위치를 3등분해 하위 초록 · 중간 파랑 · 상위 빨강', () => {
    expect(rangeZone(0).dot).toBe('bg-trend-positive')
    expect(rangeZone(0.5).dot).toBe('bg-primary')
    expect(rangeZone(1).dot).toBe('bg-stock-up')
  })
})

describe('rankPosition', () => {
  it('1위는 1, 꼴찌는 0', () => {
    expect(rankPosition(1, 10)).toBe(1)
    expect(rankPosition(10, 10)).toBe(0)
    expect(rankPosition(4, 7)).toBe(0.5)
  })

  it('비교 대상이 하나뿐이면 가운데', () => {
    expect(rankPosition(1, 1)).toBe(0.5)
  })
})
