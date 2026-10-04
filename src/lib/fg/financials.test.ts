import { describe, expect, it } from 'vitest'
import type { AnnualFinancialsRes } from '@/lib/apiTypes'
import { formatCompactKrw } from '@/lib/format'
import {
  annualPoints,
  financeSummary,
  financeTable,
  growthOf,
  growthText,
  pointDiff,
  quarterPoints,
  resultColumnLabel,
  resultReading,
  resultScale,
  resultsLead,
  shownAnnual,
  summaryBasis,
  type FinanceGapFixture,
} from '@/lib/fg/financials'

function fin(year: number, extra: Partial<AnnualFinancialsRes>): AnnualFinancialsRes {
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
    ...extra,
  }
}

const samsung: AnnualFinancialsRes[] = [
  fin(2025, { revenue: 333605938000000, operatingProfit: 43601051000000, netIncome: 45206805000000, operatingMargin: 13.0696, roe: 10.85, debtRatio: 29.9371, dps: 1668 }),
  fin(2021, { revenue: 279604800000000, operatingProfit: 51633900000000, netIncome: 39907500000000, operatingMargin: 18.4667, roe: 13.92, debtRatio: 39.9217, eps: 5777 }),
  fin(2022, { revenue: 302231400000000, operatingProfit: 43376600000000, netIncome: 55654100000000, operatingMargin: 14.3521, roe: 17.07, debtRatio: 26.4059, eps: 8057 }),
  fin(2023, { revenue: 258935494000000, operatingProfit: 6566976000000, netIncome: 15487100000000, operatingMargin: 2.5361, roe: 4.15, debtRatio: 25.3598, dps: 361 }),
  fin(2024, { revenue: 300870903000000, operatingProfit: 32725961000000, netIncome: 34451351000000, operatingMargin: 10.8771, roe: 9.03, debtRatio: 27.9319, dps: 1446 }),
]

const hlb: AnnualFinancialsRes[] = [
  fin(2022, { revenue: 179700000000, operatingProfit: -74700000000, netIncome: -98600000000, operatingMargin: -41.5693, roe: -14.56, debtRatio: 38.3834, eps: -645 }),
  fin(2023, { revenue: 42900561196, operatingProfit: -125024740610, netIncome: -206042537607, operatingMargin: -291.4291, roe: -31.57, debtRatio: 29.1071 }),
  fin(2024, { revenue: 68125727347, operatingProfit: -118516152929, netIncome: -108026798560, operatingMargin: -173.9668, roe: -16.33, debtRatio: 36.0843 }),
  fin(2025, { revenue: 84172574224, operatingProfit: -104217336541, netIncome: -235415156253, operatingMargin: -123.8139, roe: -44.32, debtRatio: 88.1375, dps: 0 }),
]

const hynix: AnnualFinancialsRes[] = [
  fin(2022, { revenue: 44621600000000, operatingProfit: 6809400000000, operatingMargin: 15.2603 }),
  fin(2023, { revenue: 32765719000000, operatingProfit: -7730313000000, operatingMargin: -23.5927 }),
  fin(2024, { revenue: 66192960000000, operatingProfit: 23467319000000, operatingMargin: 35.4529 }),
]

describe('재무 금액 표기', () => {
  it('공용 formatCompactKrw로 1조 이상은 조 소수 첫째 자리, 아래는 억, 음수는 U+2212', () => {
    expect(formatCompactKrw(333605938000000)).toBe('333.6조')
    expect(formatCompactKrw(84172574224)).toBe('842억')
    expect(formatCompactKrw(-104217336541)).toBe('−1,042억')
    expect(formatCompactKrw(-7730313000000)).toBe('−7.7조')
    expect(formatCompactKrw(null)).toBe('—')
  })
})

describe('증감', () => {
  it('금액은 증감률, 이익은 흑자·적자 전환을 말로', () => {
    expect(growthText(growthOf(333605938000000, 300870903000000, 'plain'))).toBe('+10.9%')
    expect(growthText(growthOf(6566976000000, 43376600000000, 'profit'))).toBe('−84.9%')
    expect(growthText(growthOf(-7730313000000, 6809400000000, 'profit'))).toBe('적자 전환')
    expect(growthText(growthOf(23467319000000, -7730313000000, 'profit'))).toBe('흑자 전환')
    expect(growthText(growthOf(-104217336541, -118516152929, 'profit'))).toBe('적자 지속')
    expect(growthOf(10, null, 'plain')).toBeNull()
    expect(growthOf(10, 0, 'plain')).toBeNull()
  })

  it('비율은 %p 차이', () => {
    expect(pointDiff(29.9371, 27.9319)).toBe('+2.0%p')
    expect(pointDiff(25.3598, 26.4059)).toBe('−1.0%p')
    expect(pointDiff(1, null)).toBeNull()
  })
})

describe('실적 차트', () => {
  it('연간은 마지막 해에서 거꾸로 4해를 고정하고, 없는 해는 빈 열로 둔다', () => {
    const points = annualPoints(samsung)
    expect(shownAnnual(points).map((p) => p.key)).toEqual(['2022', '2023', '2024', '2025'])
    const short = shownAnnual(annualPoints([fin(2024, { revenue: 1 }), fin(2025, { revenue: 2 })]))
    expect(short.map((p) => [p.label, p.sales])).toEqual([
      ['2022년', null],
      ['2023년', null],
      ['2024년', 1],
      ['2025년', 2],
    ])
  })

  it('머리 문장은 마지막 해의 매출·영업이익과 1년 전 비교', () => {
    const all = annualPoints(samsung)
    expect(resultsLead(shownAnnual(all), all)).toEqual({
      lead: '2025년 매출 333.6조 원, 영업이익 43.6조 원이에요.',
      tail: '1년 전보다 매출은 10.9%, 영업이익은 33.2% 늘었어요.',
    })
    const loss = annualPoints(hlb)
    expect(resultsLead(shownAnnual(loss), loss)).toEqual({
      lead: '2025년 매출 842억 원, 영업이익 −1,042억 원이에요.',
      tail: '1년 전보다 매출은 23.6% 늘었고, 영업이익은 적자 지속이에요.',
    })
    const turn = annualPoints(hynix)
    expect(resultsLead(shownAnnual(turn), turn)?.tail).toBe('1년 전보다 매출은 102.0% 늘었고, 영업이익은 흑자 전환이에요.')
  })

  it('매출과 영업이익 방향이 다르면 따로 말한다', () => {
    const all = annualPoints([fin(2024, { revenue: 100, operatingProfit: 10 }), fin(2025, { revenue: 105, operatingProfit: 9 })])
    expect(resultsLead(shownAnnual(all), all)?.tail).toBe('1년 전보다 매출은 5.0% 늘고, 영업이익은 10.0% 줄었어요.')
    const down = annualPoints([fin(2024, { revenue: 100, operatingProfit: 10 }), fin(2025, { revenue: 90, operatingProfit: 8 })])
    expect(resultsLead(shownAnnual(down), down)?.tail).toBe('1년 전보다 매출은 10.0%, 영업이익은 20.0% 줄었어요.')
    const first = annualPoints([fin(2025, { revenue: 90, operatingProfit: 8 })])
    expect(resultsLead(shownAnnual(first), first)?.tail).toBe('')
  })

  it('읽기 줄과 열 이름', () => {
    const all = annualPoints(samsung)
    const shown = shownAnnual(all)
    expect(resultReading(shown[3], all)).toEqual({
      when: '2025년',
      sales: '333.6조',
      op: '43.6조',
      margin: '13.1%',
      yoy: '1년 전보다 매출 +10.9% · 영업이익 +33.2%',
    })
    expect(resultReading(shown[1], all).yoy).toBe('1년 전보다 매출 −14.3% · 영업이익 −84.9%')
    expect(resultColumnLabel(shown[3], all)).toBe(
      '2025년 매출액 333.6조 원, 영업이익 43.6조 원, 영업이익률 13.1%, 1년 전보다 매출 +10.9%, 영업이익 +33.2%',
    )
    const loss = annualPoints(hlb)
    expect(resultReading(shownAnnual(loss)[3], loss).margin).toBe('−123.8%')
  })

  it('분기는 그 해 첫 열에만 연도를 달고 같은 분기 전년과 비교한다', () => {
    const quarters = quarterPoints([
      { year: 2025, quarter: 2, sales: 6.0e12, op: 0.97e12 },
      { year: 2024, quarter: 4, sales: 5.7e12, op: 0.71e12 },
      { year: 2025, quarter: 1, sales: 5.8e12, op: 0.85e12 },
      { year: 2026, quarter: 2, sales: 7.0e12, op: 1.12e12 },
    ])
    expect(quarters.map((q) => [q.label, q.year])).toEqual([
      ['4분기', '2024'],
      ['1분기', '2025'],
      ['2분기', ''],
      ['2분기', '2026'],
    ])
    expect(resultReading(quarters[3], quarters)).toMatchObject({ when: '2026년 2분기', yoy: '1년 전보다 매출 +16.7% · 영업이익 +15.5%' })
    expect(resultReading(quarters[1], quarters).yoy).toBeNull()
  })

  it('막대는 0 기준선에서 위아래로, 최소 2px', () => {
    const scale = resultScale([
      { key: 'a', prevKey: '', label: '', year: '', when: '', sales: 100, op: -50, margin: null },
      { key: 'b', prevKey: '', label: '', year: '', when: '', sales: 100, op: 0.01, margin: null },
    ])
    expect(scale.zero).toBe(124)
    expect(scale.box(100)).toEqual({ top: 12, height: 112 })
    expect(scale.box(-50)).toEqual({ top: 124, height: 56 })
    expect(scale.box(0.01).height).toBe(2)
  })
})

describe('재무 지표 표', () => {
  it('마지막 4해를 그룹별로, 금액 단위는 줄마다 고른다', () => {
    const table = financeTable(samsung, null)
    expect(table.years).toEqual([2022, 2023, 2024, 2025])
    const rows = Object.fromEntries(table.groups.flatMap((g) => g.rows).map((r) => [r.key, r]))
    expect(table.groups.map((g) => g.title)).toEqual(['수익성', '안정성', '주당 가치'])
    expect(rows.revenue).toMatchObject({ unit: '조 원', cells: ['302.2', '258.9', '300.9', '333.6'], yoy: '+10.9%' })
    expect(rows.operatingProfit).toMatchObject({ cells: ['43.4', '6.6', '32.7', '43.6'], yoy: '+33.2%' })
    expect(rows.operatingMargin).toMatchObject({ unit: '%', cells: ['14.4', '2.5', '10.9', '13.1'], yoy: '+2.2%p' })
    expect(rows.netIncome).toMatchObject({ cells: ['55.7', '15.5', '34.5', '45.2'], yoy: '+31.2%' })
    expect(rows.roe).toMatchObject({ label: 'ROE(자기자본이익률)', cells: ['17.1', '4.2', '9.0', '10.8'], yoy: '+1.8%p' })
    expect(rows.debtRatio).toMatchObject({ cells: ['26.4', '25.4', '27.9', '29.9'], yoy: '+2.0%p' })
    expect(rows.eps).toMatchObject({ unit: '원', cells: ['8,057', '—', '—', '—'], yoy: null })
    expect(rows.dps).toMatchObject({ cells: ['—', '361', '1,446', '1,668'], yoy: '+15.4%' })
    expect(rows.currentRatio).toMatchObject({ gap: true, cells: [null, null, null, null], yoy: null })
    expect(rows.bps).toMatchObject({ gap: true, cells: [null, null, null, null] })
  })

  it('작은 회사는 억 원, 적자는 U+2212', () => {
    const rows = Object.fromEntries(financeTable(hlb, null).groups.flatMap((g) => g.rows).map((r) => [r.key, r]))
    expect(rows.revenue).toMatchObject({ unit: '억 원', cells: ['1,797', '429', '681', '842'], yoy: '+23.6%' })
    expect(rows.operatingProfit).toMatchObject({ cells: ['−747', '−1,250', '−1,185', '−1,042'], yoy: '적자 지속' })
    expect(rows.eps.cells).toEqual(['−645', '—', '—', '—'])
    expect(rows.dps).toMatchObject({ cells: ['—', '—', '—', '0'], yoy: null })
  })

  it('갭 줄은 목업이 있으면 목업 값을 채운다', () => {
    const fixture: FinanceGapFixture = { quarters: [], bps: [46230, 44390, 47400, 51760], currentRatio: [182.4, 165.1, 171.8, 188.6] }
    const rows = Object.fromEntries(financeTable(samsung, fixture).groups.flatMap((g) => g.rows).map((r) => [r.key, r]))
    expect(rows.bps).toMatchObject({ gap: true, cells: ['46,230', '44,390', '47,400', '51,760'], yoy: '+9.2%' })
    expect(rows.currentRatio).toMatchObject({ gap: true, cells: ['182.4', '165.1', '171.8', '188.6'], yoy: '+16.8%p' })
  })

  it('재무가 없으면 빈 표', () => {
    expect(financeTable([], null).years).toEqual([])
  })
})

describe('한눈에 보기', () => {
  it('마지막 해 실적·부채비율과 외국인 누적', () => {
    const tiles = financeSummary(samsung, { days: 2, total: 2005398, note: '순매도 1일째' })
    expect(tiles).toEqual([
      { key: 'sales', label: '2025년 매출액', value: '333.6조', note: '1년 전보다 +10.9%', tone: null, target: 'results', failed: false },
      { key: 'op', label: '2025년 영업이익', value: '43.6조', note: '1년 전보다 +33.2%', tone: null, target: 'results', failed: false },
      { key: 'foreign', label: '외국인 · 2일 누적', value: '+200.5만 주', note: '순매도 1일째', tone: 'up', target: 'flow', failed: false },
      { key: 'debt', label: '부채비율 · 2025년 말', value: '29.9%', note: '1년 전보다 +2.0%p', tone: null, target: 'table', failed: false },
    ])
  })

  it('받지 못한 쪽 칸은 비운 칸이 아니라 실패 칸으로 둔다', () => {
    const noFinance = financeSummary([], { days: 2, total: 2005398, note: '' }, { finance: true })
    expect(noFinance.map((t) => [t.key, t.label, t.failed])).toEqual([
      ['sales', '매출액', true],
      ['op', '영업이익', true],
      ['foreign', '외국인 · 2일 누적', false],
      ['debt', '부채비율', true],
    ])
    const noFlows = financeSummary(samsung, null, { flows: true })
    expect(noFlows.map((t) => [t.key, t.label, t.value, t.failed])).toEqual([
      ['sales', '2025년 매출액', '333.6조', false],
      ['op', '2025년 영업이익', '43.6조', false],
      ['foreign', '외국인 누적', '—', true],
      ['debt', '부채비율 · 2025년 말', '29.9%', false],
    ])
  })

  it('수급이 없으면 외국인 칸을 빼고, 재무가 없으면 실적 칸을 비운다', () => {
    expect(financeSummary(samsung, null).map((t) => t.key)).toEqual(['sales', 'op', 'debt'])
    expect(financeSummary([], null).map((t) => [t.label, t.value])).toEqual([
      ['매출액', '—'],
      ['영업이익', '—'],
      ['부채비율', '—'],
    ])
  })

  it('기준 문구', () => {
    expect(summaryBasis(2025, '2026-09-29', 2026)).toBe('2025년 실적과 9월 29일 장 마감 수급 기준이에요')
    expect(summaryBasis(2025, null, 2026)).toBe('2025년 실적 기준이에요')
    expect(summaryBasis(null, '2025-12-30', 2026)).toBe('2025년 12월 30일 장 마감 수급 기준이에요')
    expect(summaryBasis(null, null, 2026)).toBeNull()
  })
})
