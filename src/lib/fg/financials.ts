import { sliceRecentYears } from '@/lib/annualPeriod'
import type { AnnualFinancialsRes } from '@/lib/apiTypes'
import { formatCompactKrw } from '@/lib/format'
import { toneOf, type Tone } from '@/lib/fg/format'
import { formatShares, type ForeignSummaryValue } from '@/lib/fg/investorFlows'
import { formatRatio } from '@/lib/fg/stockQuote'
import { monthDayLabel } from '@/lib/fg/themeCharts'

export const RESULT_YEARS = 4
export const RESULT_PLOT_HEIGHT = 192
const PLOT_PAD = 12
const MIN_BAR = 2
const TRILLION = 1e12
const EOK = 1e8
const DASH = '—'
const MINUS = '−'

export type ResultPeriod = 'annual' | 'quarter'

export interface QuarterResult {
  year: number
  quarter: 1 | 2 | 3 | 4
  sales: number
  op: number
}

export interface FinanceGapFixture {
  quarters: readonly QuarterResult[]
  bps: readonly number[]
  currentRatio: readonly number[]
}

export interface ResultPoint {
  key: string
  prevKey: string
  label: string
  year: string
  when: string
  sales: number | null
  op: number | null
  margin: number | null
}

type TurnLabel = '흑자 전환' | '적자 전환' | '적자 지속'

export type Growth = { kind: 'rate'; rate: number } | { kind: 'turn'; label: TurnLabel }

function signed(text: string, negative: boolean): string {
  return negative && /[1-9]/.test(text) ? `${MINUS}${text}` : text
}

function fixed1(value: number): string {
  return signed(Math.abs(value).toFixed(1), value < 0)
}

export function growthOf(cur: number | null, prev: number | null, kind: 'profit' | 'plain'): Growth | null {
  if (cur === null || prev === null) return null
  if (kind === 'profit') {
    if (prev <= 0 && cur > 0) return { kind: 'turn', label: '흑자 전환' }
    if (prev > 0 && cur <= 0) return { kind: 'turn', label: '적자 전환' }
    if (prev <= 0 && cur <= 0) return { kind: 'turn', label: '적자 지속' }
  }
  if (prev <= 0) return null
  return { kind: 'rate', rate: (cur / prev - 1) * 100 }
}

function rateText(rate: number): string {
  const rounded = Math.round(Math.abs(rate) * 10) / 10
  const text = rounded.toFixed(1)
  if (rounded === 0) return `${text}%`
  return `${rate > 0 ? '+' : MINUS}${text}%`
}

export function growthText(growth: Growth | null): string | null {
  if (growth === null) return null
  return growth.kind === 'turn' ? growth.label : rateText(growth.rate)
}

export function pointDiff(cur: number | null, prev: number | null): string | null {
  if (cur === null || prev === null) return null
  return `${rateText(cur - prev)}p`
}

function marginOf(sales: number | null, op: number | null): number | null {
  return sales === null || op === null || sales === 0 ? null : (op / sales) * 100
}

export function annualPoints(rows: readonly AnnualFinancialsRes[]): ResultPoint[] {
  return sliceRecentYears([...rows], null).map((row) => ({
    key: String(row.year),
    prevKey: String(row.year - 1),
    label: `${row.year}년`,
    year: '',
    when: `${row.year}년`,
    sales: row.revenue,
    op: row.operatingProfit,
    margin: row.operatingMargin ?? marginOf(row.revenue, row.operatingProfit),
  }))
}

function quarterKey(year: number, quarter: number): string {
  return `${year}Q${quarter}`
}

export function quarterPoints(quarters: readonly QuarterResult[]): ResultPoint[] {
  const sorted = [...quarters].sort((a, b) => a.year - b.year || a.quarter - b.quarter)
  return sorted.map((q, i) => ({
    key: quarterKey(q.year, q.quarter),
    prevKey: quarterKey(q.year - 1, q.quarter),
    label: `${q.quarter}분기`,
    year: i === 0 || sorted[i - 1].year !== q.year ? String(q.year) : '',
    when: `${q.year}년 ${q.quarter}분기`,
    sales: q.sales,
    op: q.op,
    margin: marginOf(q.sales, q.op),
  }))
}

function emptyYear(year: number): ResultPoint {
  return { key: String(year), prevKey: String(year - 1), label: `${year}년`, year: '', when: `${year}년`, sales: null, op: null, margin: null }
}

function anchoredYears(years: readonly number[], count: number): number[] {
  if (years.length === 0) return []
  const last = Math.max(...years)
  return Array.from({ length: count }, (_, i) => last - count + 1 + i)
}

export function shownAnnual(points: readonly ResultPoint[], count = RESULT_YEARS): ResultPoint[] {
  const byKey = new Map(points.map((p) => [p.key, p]))
  return anchoredYears(
    points.map((p) => Number(p.key)),
    count,
  ).map((year) => byKey.get(String(year)) ?? emptyYear(year))
}

export interface BarBox {
  top: number
  height: number
}

export interface ResultScale {
  zero: number
  box: (value: number) => BarBox
}

export function resultScale(points: readonly ResultPoint[]): ResultScale {
  const values = points.flatMap((p) => [p.sales, p.op]).filter((v): v is number => v !== null)
  const max = Math.max(0, ...values)
  const min = Math.min(0, ...values)
  const span = max - min || 1
  const room = RESULT_PLOT_HEIGHT - PLOT_PAD - (min < 0 ? PLOT_PAD : 0)
  const yOf = (value: number) => PLOT_PAD + ((max - value) / span) * room
  const zero = yOf(0)
  return {
    zero: Math.round(zero),
    box: (value) => {
      const y = yOf(value)
      return { top: Math.round(Math.min(y, zero)), height: Math.round(Math.max(MIN_BAR, Math.abs(y - zero))) }
    },
  }
}

function prevOf(point: ResultPoint, all: readonly ResultPoint[]): ResultPoint | null {
  return all.find((p) => p.key === point.prevKey) ?? null
}

function growthsOf(point: ResultPoint, all: readonly ResultPoint[]): { sales: Growth | null; op: Growth | null } {
  const prev = prevOf(point, all)
  return {
    sales: prev ? growthOf(point.sales, prev.sales, 'plain') : null,
    op: prev ? growthOf(point.op, prev.op, 'profit') : null,
  }
}

function amountOf(rate: number): string {
  return `${(Math.round(Math.abs(rate) * 10) / 10).toFixed(1)}%`
}

function stem(rate: number): string {
  return rate < 0 ? '줄' : '늘'
}

function leadGrowth(sales: Growth | null, op: Growth | null): string {
  const s = sales?.kind === 'rate' ? sales : null
  if (s && op?.kind === 'rate') {
    if (stem(s.rate) === stem(op.rate))
      return `1년 전보다 매출은 ${amountOf(s.rate)}, 영업이익은 ${amountOf(op.rate)} ${stem(s.rate)}었어요.`
    return `1년 전보다 매출은 ${amountOf(s.rate)} ${stem(s.rate)}고, 영업이익은 ${amountOf(op.rate)} ${stem(op.rate)}었어요.`
  }
  if (s && op?.kind === 'turn') return `1년 전보다 매출은 ${amountOf(s.rate)} ${stem(s.rate)}었고, 영업이익은 ${op.label}이에요.`
  if (s) return `1년 전보다 매출은 ${amountOf(s.rate)} ${stem(s.rate)}었어요.`
  if (op?.kind === 'rate') return `1년 전보다 영업이익은 ${amountOf(op.rate)} ${stem(op.rate)}었어요.`
  if (op?.kind === 'turn') return `1년 전보다 영업이익은 ${op.label}이에요.`
  return ''
}

export interface ResultsLead {
  lead: string
  tail: string
}

export function resultsLead(shown: readonly ResultPoint[], all: readonly ResultPoint[]): ResultsLead | null {
  const latest = shown[shown.length - 1]
  if (!latest || (latest.sales === null && latest.op === null)) return null
  const parts = [
    ...(latest.sales === null ? [] : [`매출 ${formatCompactKrw(latest.sales)} 원`]),
    ...(latest.op === null ? [] : [`영업이익 ${formatCompactKrw(latest.op)} 원`]),
  ]
  const { sales, op } = growthsOf(latest, all)
  return { lead: `${latest.when} ${parts.join(', ')}이에요.`, tail: leadGrowth(sales, op) }
}

export interface ResultReading {
  when: string
  sales: string
  op: string
  margin: string
  yoy: string | null
}

function yoyParts(point: ResultPoint, all: readonly ResultPoint[]): string[] {
  const { sales, op } = growthsOf(point, all)
  const s = growthText(sales)
  const o = growthText(op)
  return [...(s ? [`매출 ${s}`] : []), ...(o ? [`영업이익 ${o}`] : [])]
}

export function resultReading(point: ResultPoint, all: readonly ResultPoint[]): ResultReading {
  const parts = yoyParts(point, all)
  return {
    when: point.when,
    sales: formatCompactKrw(point.sales),
    op: formatCompactKrw(point.op),
    margin: formatRatio(point.margin),
    yoy: parts.length > 0 ? `1년 전보다 ${parts.join(' · ')}` : null,
  }
}

export function resultColumnLabel(point: ResultPoint, all: readonly ResultPoint[]): string {
  const reading = resultReading(point, all)
  const parts = yoyParts(point, all)
  const base = `${point.when} 매출액 ${reading.sales} 원, 영업이익 ${reading.op} 원, 영업이익률 ${reading.margin}`
  return parts.length > 0 ? `${base}, 1년 전보다 ${parts.join(', ')}` : base
}

type RowKind = 'amount' | 'ratio' | 'perShare'

interface RowSpec {
  key: string
  label: string
  kind: RowKind
  growth: 'profit' | 'plain'
  value: (row: AnnualFinancialsRes) => number | null
}

interface GapSpec {
  key: 'currentRatio' | 'bps'
  label: string
  kind: 'ratio' | 'perShare'
}

const GROUPS: readonly { title: string; rows: readonly (RowSpec | GapSpec)[] }[] = [
  {
    title: '수익성',
    rows: [
      { key: 'revenue', label: '매출액', kind: 'amount', growth: 'plain', value: (r) => r.revenue },
      { key: 'operatingProfit', label: '영업이익', kind: 'amount', growth: 'profit', value: (r) => r.operatingProfit },
      { key: 'operatingMargin', label: '영업이익률', kind: 'ratio', growth: 'plain', value: (r) => r.operatingMargin },
      { key: 'netIncome', label: '순이익', kind: 'amount', growth: 'profit', value: (r) => r.netIncome },
      { key: 'roe', label: 'ROE(자기자본이익률)', kind: 'ratio', growth: 'plain', value: (r) => r.roe },
    ],
  },
  {
    title: '안정성',
    rows: [
      { key: 'debtRatio', label: '부채비율', kind: 'ratio', growth: 'plain', value: (r) => r.debtRatio },
      { key: 'currentRatio', label: '유동비율', kind: 'ratio' },
    ],
  },
  {
    title: '주당 가치',
    rows: [
      { key: 'eps', label: 'EPS(주당순이익)', kind: 'perShare', growth: 'profit', value: (r) => r.eps },
      { key: 'bps', label: 'BPS(주당순자산)', kind: 'perShare' },
      { key: 'dps', label: '주당 배당금', kind: 'perShare', growth: 'plain', value: (r) => r.dps },
    ],
  },
]

export interface FinanceRow {
  key: string
  label: string
  unit: string
  cells: (string | null)[]
  yoy: string | null
  gap: boolean
}

export interface FinanceGroup {
  title: string
  rows: FinanceRow[]
}

export interface FinanceTable {
  years: number[]
  groups: FinanceGroup[]
}

function wholeText(value: number): string {
  return signed(Math.abs(Math.round(value)).toLocaleString('ko-KR'), value < 0)
}

function joText(won: number): string {
  const text = (Math.abs(won) / TRILLION).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return signed(text, won < 0)
}

function cellFormat(kind: RowKind, values: readonly (number | null)[]): { unit: string; format: (v: number) => string } {
  if (kind === 'ratio') return { unit: '%', format: fixed1 }
  if (kind === 'perShare') return { unit: '원', format: wholeText }
  const big = values.some((v) => v !== null && Math.abs(v) >= TRILLION)
  return big ? { unit: '조 원', format: joText } : { unit: '억 원', format: (v) => wholeText(v / EOK) }
}

function yoyOf(kind: RowKind, growth: 'profit' | 'plain', cur: number | null, prev: number | null): string | null {
  return kind === 'ratio' ? pointDiff(cur, prev) : growthText(growthOf(cur, prev, growth))
}

function isGap(spec: RowSpec | GapSpec): spec is GapSpec {
  return !('value' in spec)
}

function gapRow(spec: GapSpec, fixture: FinanceGapFixture | null, count: number): FinanceRow {
  const mock = fixture ? (spec.key === 'bps' ? fixture.bps : fixture.currentRatio).slice(-count) : null
  const { unit, format } = cellFormat(spec.kind, mock ?? [])
  const cells = mock && mock.length === count ? mock.map(format) : Array.from({ length: count }, () => null)
  const yoy = mock && mock.length >= 2 ? yoyOf(spec.kind, 'plain', mock[mock.length - 1], mock[mock.length - 2]) : null
  return { key: spec.key, label: spec.label, unit, cells, yoy, gap: true }
}

export function financeTable(rows: readonly AnnualFinancialsRes[], fixture: FinanceGapFixture | null, count = RESULT_YEARS): FinanceTable {
  const byYear = new Map(rows.map((row) => [row.year, row]))
  const years = anchoredYears(
    rows.map((row) => row.year),
    count,
  )
  if (years.length === 0) return { years: [], groups: [] }
  const last = years[years.length - 1]
  return {
    years,
    groups: GROUPS.map((group) => ({
      title: group.title,
      rows: group.rows.map((spec) => {
        if (isGap(spec)) return gapRow(spec, fixture, count)
        const values = years.map((year) => {
          const row = byYear.get(year)
          return row ? spec.value(row) : null
        })
        const { unit, format } = cellFormat(spec.kind, values)
        const prev = byYear.get(last - 1)
        return {
          key: spec.key,
          label: spec.label,
          unit,
          cells: values.map((v) => (v === null ? DASH : format(v))),
          yoy: yoyOf(spec.kind, spec.growth, values[values.length - 1], prev ? spec.value(prev) : null),
          gap: false,
        }
      }),
    })),
  }
}

export type SummaryTarget = 'results' | 'flow' | 'table'

export interface SummaryTile {
  key: 'sales' | 'op' | 'foreign' | 'debt'
  label: string
  value: string
  note: string | null
  tone: Tone | null
  target: SummaryTarget
  failed: boolean
}

export interface SummaryFailed {
  finance?: boolean
  flows?: boolean
}

function versus(text: string | null): string | null {
  return text === null ? null : `1년 전보다 ${text}`
}

export function financeSummary(
  rows: readonly AnnualFinancialsRes[],
  foreign: ForeignSummaryValue | null,
  failed: SummaryFailed = {},
): SummaryTile[] {
  const financeFailed = failed.finance === true
  const sorted = sliceRecentYears([...rows], null)
  const latest = sorted[sorted.length - 1] ?? null
  const prev = latest ? (sorted.find((row) => row.year === latest.year - 1) ?? null) : null
  const year = latest ? `${latest.year}년 ` : ''
  const tiles: SummaryTile[] = [
    {
      key: 'sales',
      label: `${year}매출액`,
      value: formatCompactKrw(latest?.revenue ?? null),
      note: versus(growthText(growthOf(latest?.revenue ?? null, prev?.revenue ?? null, 'plain'))),
      tone: null,
      target: 'results',
      failed: financeFailed,
    },
    {
      key: 'op',
      label: `${year}영업이익`,
      value: formatCompactKrw(latest?.operatingProfit ?? null),
      note: versus(growthText(growthOf(latest?.operatingProfit ?? null, prev?.operatingProfit ?? null, 'profit'))),
      tone: null,
      target: 'results',
      failed: financeFailed,
    },
  ]
  if (foreign)
    tiles.push({
      key: 'foreign',
      label: `외국인 · ${foreign.days}일 누적`,
      value: foreign.total === null ? DASH : formatShares(foreign.total),
      note: foreign.note || null,
      tone: foreign.total === null ? null : toneOf(foreign.total),
      target: 'flow',
      failed: false,
    })
  else if (failed.flows === true)
    tiles.push({ key: 'foreign', label: '외국인 누적', value: DASH, note: null, tone: null, target: 'flow', failed: true })
  tiles.push({
    key: 'debt',
    label: latest ? `부채비율 · ${latest.year}년 말` : '부채비율',
    value: formatRatio(latest?.debtRatio ?? null),
    note: versus(pointDiff(latest?.debtRatio ?? null, prev?.debtRatio ?? null)),
    tone: null,
    target: 'table',
    failed: financeFailed,
  })
  return tiles
}

export function summaryBasis(year: number | null, flowDate: string | null, refYear: number): string | null {
  const flow = flowDate ? `${monthDayLabel(flowDate, refYear)} 장 마감 수급` : null
  if (year !== null && flow) return `${year}년 실적과 ${flow} 기준이에요`
  if (year !== null) return `${year}년 실적 기준이에요`
  if (flow) return `${flow} 기준이에요`
  return null
}
