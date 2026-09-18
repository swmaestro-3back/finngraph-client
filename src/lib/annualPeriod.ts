import type { AnnualFinancials } from '@/lib/apiTypes'

// 연간 실적 차트의 표시 기간과, 재무 지표 요약 표의 고정 연도 범위.
// SUPPLY_RANGES(apiTypes)는 API limit 파라미터지만, 이건 이미 받아온 행을 화면에서 자르거나 채우는 용도라 따로 둔다.

export type AnnualPeriod = 'Y5' | 'Y10' | 'ALL'

export const ANNUAL_PERIODS: { key: AnnualPeriod; label: string; years: number | null }[] = [
  { key: 'Y5', label: '5년', years: 5 },
  { key: 'Y10', label: '10년', years: 10 },
  { key: 'ALL', label: '전체', years: null },
]

/** 디자인 시안(14개 슬롯)에 가장 가까운 밀도 */
export const DEFAULT_ANNUAL_PERIOD: AnnualPeriod = 'Y10'

/** 기간 → 연도 수. 전체는 null */
export function yearsFor(period: AnnualPeriod): number | null {
  return ANNUAL_PERIODS.find((p) => p.key === period)?.years ?? null
}

/**
 * 연도 오름차순으로 정렬한 뒤 최신 N개만 남긴다. 추정치(E) 행은 연도가 가장 크므로 자연히 포함된다.
 * 입력 순서에 기대지 않는다 — 순서가 뒤바뀌면 최신 연도가 잘려 나가거나 축이 뒤집히기 때문.
 */
export function sliceRecentYears<T extends { year: number }>(rows: T[], years: number | null): T[] {
  const sorted = [...rows].sort((a, b) => a.year - b.year)
  return years === null || sorted.length <= years ? sorted : sorted.slice(-years)
}

/** 값이 하나도 없는 연도 행 — 상장 전·미공시 연도를 표에서 '-'로 채울 때 쓴다 */
export function emptyFinancials(year: number): AnnualFinancials {
  return {
    year,
    revenue: null,
    operatingProfit: null,
    netIncome: null,
    operatingMargin: null,
    roe: null,
    debtRatio: null,
    totalAssets: null,
    separateAssets: null,
    totalEquity: null,
    totalDebt: null,
    eps: null,
    per: null,
    pbr: null,
    dps: null,
    payoutRatio: null,
  }
}

/**
 * fromYear부터 데이터의 마지막 연도까지 빠짐없이 한 행씩 만든다. 없는 연도는 빈 행.
 * 표의 열 수가 종목마다 달라지지 않게 하려는 것 — 2020년 상장사는 2007~2019가 전부 '-'로 나온다.
 * fromYear보다 이른 데이터는 버린다.
 */
export function fillYearRange(rows: AnnualFinancials[], fromYear: number): AnnualFinancials[] {
  if (rows.length === 0) return []
  const byYear = new Map(rows.map((r) => [r.year, r]))
  const toYear = Math.max(fromYear, ...rows.map((r) => r.year))
  return Array.from({ length: toYear - fromYear + 1 }, (_, i) => {
    const year = fromYear + i
    return byYear.get(year) ?? emptyFinancials(year)
  })
}
