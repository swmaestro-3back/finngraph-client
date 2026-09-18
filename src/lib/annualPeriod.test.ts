import { describe, expect, it } from 'vitest'
import {
  ANNUAL_PERIODS,
  DEFAULT_ANNUAL_PERIOD,
  emptyFinancials,
  fillYearRange,
  sliceRecentYears,
  yearsFor,
} from '@/lib/annualPeriod'

const years = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ year: from + i }))

describe('annualPeriod', () => {
  it('기본 기간은 10년', () => {
    expect(DEFAULT_ANNUAL_PERIOD).toBe('Y10')
    expect(ANNUAL_PERIODS.map((p) => p.key)).toEqual(['Y5', 'Y10', 'ALL'])
  })

  it('yearsFor — 전체는 null, 나머지는 연도 수', () => {
    expect(yearsFor('Y5')).toBe(5)
    expect(yearsFor('Y10')).toBe(10)
    expect(yearsFor('ALL')).toBeNull()
  })

  it('전체(null)면 전부 돌려준다', () => {
    const rows = years(2004, 2025)
    expect(sliceRecentYears(rows, null)).toEqual(rows)
  })

  it('행이 N개 이하면 전부 돌려준다', () => {
    const rows = years(2022, 2025)
    expect(sliceRecentYears(rows, 5)).toEqual(rows)
    expect(sliceRecentYears(rows, 4)).toEqual(rows)
  })

  it('자르지 않아도 연도 오름차순으로 정렬한다', () => {
    const rows = [{ year: 2025 }, { year: 2023 }, { year: 2024 }]
    expect(sliceRecentYears(rows, null).map((r) => r.year)).toEqual([2023, 2024, 2025])
  })

  it('N개를 넘으면 최신 N개만 — 추정치 연도는 마지막이라 항상 포함', () => {
    const rows = [...years(2004, 2025), { year: 2026, estimated: true }]
    const out = sliceRecentYears(rows, 5)
    expect(out.map((r) => r.year)).toEqual([2022, 2023, 2024, 2025, 2026])
  })

  it('연도 순서가 뒤섞여 있어도 최신 N개를 고른다', () => {
    const rows = [{ year: 2025 }, { year: 2004 }, { year: 2024 }, { year: 2010 }]
    expect(sliceRecentYears(rows, 2).map((r) => r.year)).toEqual([2024, 2025])
  })

  it('빈 배열은 빈 배열', () => {
    expect(sliceRecentYears([], 10)).toEqual([])
  })

  describe('fillYearRange', () => {
    const row = (year: number, revenue: number) => ({ ...emptyFinancials(year), revenue })

    it('시작 연도부터 마지막 데이터 연도까지 빠진 해를 빈 행으로 채운다', () => {
      const out = fillYearRange([row(2020, 1), row(2022, 3)], 2018)
      expect(out.map((r) => r.year)).toEqual([2018, 2019, 2020, 2021, 2022])
      expect(out.map((r) => r.revenue)).toEqual([null, null, 1, null, 3])
    })

    it('시작 연도보다 이른 데이터는 버린다', () => {
      const out = fillYearRange([row(2004, 1), row(2007, 2), row(2008, 3)], 2007)
      expect(out.map((r) => r.year)).toEqual([2007, 2008])
    })

    it('추정치(E) 행도 마지막 연도로 포함한다', () => {
      const out = fillYearRange([row(2024, 1), { ...row(2025, 2), estimated: true }], 2023)
      expect(out.map((r) => r.year)).toEqual([2023, 2024, 2025])
      expect(out[2].estimated).toBe(true)
    })

    it('입력 순서와 무관하게 연도 오름차순', () => {
      const out = fillYearRange([row(2009, 1), row(2007, 2)], 2007)
      expect(out.map((r) => r.year)).toEqual([2007, 2008, 2009])
    })

    it('빈 입력은 빈 배열', () => {
      expect(fillYearRange([], 2007)).toEqual([])
    })
  })
})
