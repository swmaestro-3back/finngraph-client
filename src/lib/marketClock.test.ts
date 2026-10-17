import { describe, expect, it } from 'vitest'
import { isKrxOpen, isQuoteHours } from '@/lib/marketClock'

describe('isKrxOpen', () => {
  it('평일 09:00–15:30 KST 만 장중', () => {
    expect(isKrxOpen(new Date('2026-10-02T09:00:00+09:00'))).toBe(true)
    expect(isKrxOpen(new Date('2026-10-02T15:29:59+09:00'))).toBe(true)
    expect(isKrxOpen(new Date('2026-10-02T08:59:59+09:00'))).toBe(false)
    expect(isKrxOpen(new Date('2026-10-02T15:30:00+09:00'))).toBe(false)
  })

  it('주말은 장마감', () => {
    expect(isKrxOpen(new Date('2026-10-03T10:00:00+09:00'))).toBe(false)
    expect(isKrxOpen(new Date('2026-10-04T10:00:00+09:00'))).toBe(false)
  })

  it('사용자 시간대와 무관하게 KST 로 판정한다', () => {
    // UTC 01:00 = KST 10:00 (금)
    expect(isKrxOpen(new Date('2026-10-02T01:00:00Z'))).toBe(true)
    // UTC 금 23:00 = KST 토 08:00
    expect(isKrxOpen(new Date('2026-10-02T23:00:00Z'))).toBe(false)
  })
})

describe('isQuoteHours', () => {
  it('평일 08:00–20:00 KST 만 시세 갱신 시간', () => {
    expect(isQuoteHours(new Date('2026-10-02T08:00:00+09:00'))).toBe(true)
    expect(isQuoteHours(new Date('2026-10-02T15:40:00+09:00'))).toBe(true)
    expect(isQuoteHours(new Date('2026-10-02T19:59:59+09:00'))).toBe(true)
    expect(isQuoteHours(new Date('2026-10-02T07:59:59+09:00'))).toBe(false)
    expect(isQuoteHours(new Date('2026-10-02T20:00:00+09:00'))).toBe(false)
  })

  it('주말은 시세 갱신 시간이 아니다', () => {
    expect(isQuoteHours(new Date('2026-10-03T10:00:00+09:00'))).toBe(false)
    expect(isQuoteHours(new Date('2026-10-04T19:00:00+09:00'))).toBe(false)
  })

  it('사용자 시간대와 무관하게 KST 로 판정한다', () => {
    expect(isQuoteHours(new Date('2026-10-01T23:00:00Z'))).toBe(true)
    expect(isQuoteHours(new Date('2026-10-02T11:00:00Z'))).toBe(false)
    expect(isQuoteHours(new Date('2026-10-02T23:30:00Z'))).toBe(false)
  })
})
