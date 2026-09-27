import { describe, expect, it } from 'vitest'
import { formatTradingDate, lastTradingDate } from '@/lib/referenceDate'

const candle = (date: string) => ({ date, open: 1, high: 1, low: 1, close: 1, volume: 1 })

describe('lastTradingDate', () => {
  it('정렬과 무관하게 가장 늦은 거래일', () => {
    expect(lastTradingDate([candle('2026-09-24'), candle('2026-09-26'), candle('2026-09-25')])).toBe(
      '2026-09-26',
    )
    expect(lastTradingDate([])).toBeNull()
    expect(lastTradingDate(null)).toBeNull()
  })
})

describe('formatTradingDate', () => {
  it('요일을 붙이고 시간대 이동 없이 날짜를 유지한다', () => {
    expect(formatTradingDate('2026-09-26')).toBe('2026-09-26 (토)')
    expect(formatTradingDate('2026-09-25')).toBe('2026-09-25 (금)')
  })
})
