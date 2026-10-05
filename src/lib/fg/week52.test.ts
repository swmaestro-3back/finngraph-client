import { describe, expect, it } from 'vitest'
import { gapFromHigh, week52GroupLabel, week52Position, week52RecordDay, week52ValueText } from '@/lib/fg/week52'

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

describe('week52GroupLabel', () => {
  it('기준과 기준일을 이름과 함께 읽어 준다', () => {
    expect(week52GroupLabel('삼성전자', 'close', '2026-09-30')).toBe('삼성전자 52주 범위 · 종가 기준 · 9월 30일까지')
    expect(week52GroupLabel('한빛반도체', 'intraday', null)).toBe('한빛반도체 52주 범위 · 장중 고가·저가 기준')
  })
})

describe('week52ValueText', () => {
  it('현재가와 양 끝, 막대 위치를 문장으로', () => {
    expect(week52ValueText({ price: 72400, high: 74900, low: 38200 })).toBe(
      '현재 72,400원, 최저 38,200원부터 최고 74,900원 사이 93% 위치',
    )
  })

  it('막대를 그리지 않으면 위치를 빼고 읽는다', () => {
    expect(week52ValueText({ price: 1000, high: 1000, low: 1000 })).toBe('현재 1,000원, 최저 1,000원부터 최고 1,000원')
  })
})

describe('week52RecordDay', () => {
  it('마지막 캔들이 오늘이면 오늘, 아니면 그날 날짜로 쓴다', () => {
    expect(week52RecordDay('2026-10-05', '2026-10-05')).toBe('오늘')
    expect(week52RecordDay('2026-09-30', '2026-10-04')).toBe('9월 30일')
    expect(week52RecordDay('2025-12-30', '2026-01-02')).toBe('2025년 12월 30일')
  })

  it('기준일을 모르면 오늘로 쓴다', () => {
    expect(week52RecordDay(null, '2026-10-04')).toBe('오늘')
  })
})
