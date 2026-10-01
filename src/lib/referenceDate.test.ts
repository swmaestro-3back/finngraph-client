import { describe, expect, it } from 'vitest'
import { formatTradingDate, intradayTime, lastTradingDate, priceBasisSuffix } from '@/lib/referenceDate'

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

describe('priceBasisSuffix', () => {
  it('가격 기준일이 확정되면 종가 기준이다', () => {
    expect(priceBasisSuffix({ baseDate: '2026-09-30', valuationDate: '2026-09-30', updatedAt: '2026-09-30T18:05:00+09:00' })).toBe('종가 기준')
  })

  it('밸류에이션이 아직 전일이면 가격 갱신 시각 기준이다', () => {
    expect(priceBasisSuffix({ baseDate: '2026-10-01', valuationDate: '2026-09-30', updatedAt: '2026-10-01T11:00:12+09:00' })).toBe('11:00 기준')
  })

  it('갱신 시각은 사용자 시간대와 무관하게 KST로 표시한다', () => {
    expect(intradayTime({ baseDate: '2026-10-01', valuationDate: '2026-09-30', updatedAt: '2026-10-01T02:05:00Z' })).toBe('11:05')
  })

  it('필드가 없거나 시각을 읽을 수 없으면 종가 기준으로 둔다', () => {
    expect(priceBasisSuffix(null)).toBe('종가 기준')
    expect(priceBasisSuffix({ baseDate: '2026-10-01' })).toBe('종가 기준')
    expect(priceBasisSuffix({ baseDate: '2026-10-01', valuationDate: '2026-09-30', updatedAt: 'invalid' })).toBe('종가 기준')
  })
})
