import { describe, expect, it } from 'vitest'
import {
  dateTicks,
  dayLabel,
  formatAxisPercent,
  minusMonths,
  monthDayLabel,
  niceAxis,
  periodStartIndex,
} from '@/lib/fg/themeCharts'

describe('minusMonths', () => {
  it('같은 날짜로 달을 뺀다', () => {
    expect(minusMonths('2026-09-30', 1)).toBe('2026-08-30')
    expect(minusMonths('2026-09-30', 3)).toBe('2026-06-30')
    expect(minusMonths('2026-09-30', 12)).toBe('2025-09-30')
  })

  it('해를 넘긴다', () => {
    expect(minusMonths('2026-02-10', 6)).toBe('2025-08-10')
    expect(minusMonths('2026-01-05', 1)).toBe('2025-12-05')
  })

  it('없는 날은 그 달 마지막 날로 맞춘다', () => {
    expect(minusMonths('2026-05-31', 3)).toBe('2026-02-28')
    expect(minusMonths('2024-02-29', 12)).toBe('2023-02-28')
    expect(minusMonths('2026-07-31', 1)).toBe('2026-06-30')
  })
})

describe('periodStartIndex', () => {
  const dates = ['2026-06-26', '2026-06-29', '2026-06-30', '2026-07-01', '2026-08-31', '2026-09-30']

  it('기준일에서 기간을 뺀 날 이전의 마지막 거래일을 고른다', () => {
    expect(periodStartIndex(dates, 3)).toBe(2)
    expect(periodStartIndex(dates, 1)).toBe(3)
  })

  it('그날이 휴장일이면 그 앞 거래일이다', () => {
    expect(periodStartIndex(['2026-06-26', '2026-07-01', '2026-09-30'], 3)).toBe(0)
  })

  it('이력이 기간보다 짧으면 첫날이다', () => {
    expect(periodStartIndex(dates, 12)).toBe(0)
    expect(periodStartIndex([], 3)).toBe(0)
  })
})

describe('niceAxis', () => {
  it('최소·최대를 눈금 단위로 넓히고 0을 포함한 눈금을 준다', () => {
    expect(niceAxis(-3.2, 41.7, 5)).toEqual({ lo: -10, hi: 50, ticks: [-10, 0, 10, 20, 30, 40, 50] })
  })

  it('범위를 maxSteps칸 안에 담는 가장 촘촘한 1·2·2.5·5 단위를 고른다', () => {
    expect(niceAxis(647.48, 1516.24, 4)).toEqual({ lo: 500, hi: 1750, ticks: [500, 750, 1000, 1250, 1500, 1750] })
    expect(niceAxis(1180.5, 1540.2, 4)).toEqual({ lo: 1100, hi: 1600, ticks: [1100, 1200, 1300, 1400, 1500, 1600] })
  })

  it('소수 단위도 다룬다', () => {
    expect(niceAxis(0.3, 1.9, 4)).toEqual({ lo: 0, hi: 2, ticks: [0, 0.5, 1, 1.5, 2] })
  })

  it('값이 하나뿐이어도 빈 축을 주지 않는다', () => {
    const axis = niceAxis(5, 5, 4)
    expect(axis.hi).toBeGreaterThan(axis.lo)
    expect(axis.ticks.length).toBeGreaterThan(1)
  })
})

describe('formatAxisPercent', () => {
  it('0은 부호 없이, 양수는 +, 음수는 U+2212로 쓴다', () => {
    expect(formatAxisPercent(0)).toBe('0%')
    expect(formatAxisPercent(20)).toBe('+20%')
    expect(formatAxisPercent(-12.5)).toBe('−12.5%')
    expect(formatAxisPercent(0.1 + 0.2)).toBe('+0.3%')
  })
})

describe('dateTicks', () => {
  it('days는 5거래일마다 월.일로 적는다', () => {
    const dates = Array.from({ length: 12 }, (_, i) => `2026-09-${String(i + 10).padStart(2, '0')}`)
    expect(dateTicks(dates, 'days')).toEqual([
      { index: 5, label: '9.15' },
      { index: 10, label: '9.20' },
    ])
  })

  it('months는 달이 바뀌는 첫 거래일에 적고, 1월에는 연도를 붙인다', () => {
    const dates = ['2025-11-28', '2025-12-01', '2025-12-30', '2026-01-02', '2026-02-02']
    expect(dateTicks(dates, 'months')).toEqual([
      { index: 1, label: '12월' },
      { index: 3, label: '2026년 1월' },
      { index: 4, label: '2월' },
    ])
  })

  it('even-months는 짝수 달만 적는다', () => {
    const dates = ['2025-11-28', '2025-12-01', '2026-01-02', '2026-02-02', '2026-03-03']
    expect(dateTicks(dates, 'even-months')).toEqual([
      { index: 1, label: '12월' },
      { index: 3, label: '2월' },
    ])
  })
})

describe('날짜 문구', () => {
  it('monthDayLabel은 기준 연도와 다를 때만 연도를 붙인다', () => {
    expect(monthDayLabel('2026-09-03', 2026)).toBe('9월 3일')
    expect(monthDayLabel('2025-10-02', 2026)).toBe('2025년 10월 2일')
  })

  it('dayLabel은 요일을 붙인다', () => {
    expect(dayLabel('2026-10-02', 2026)).toBe('10월 2일(금)')
    expect(dayLabel('2026-09-27', 2026)).toBe('9월 27일(일)')
    expect(dayLabel('2025-12-31', 2026)).toBe('2025년 12월 31일(수)')
  })
})
