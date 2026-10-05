import type { CandleRes, InvestorFlowRes } from '@/lib/apiTypes'
import { WEEKDAY_LABELS } from '@/lib/calendar'
import { formatChange } from '@/lib/format'
import { candleChangeAt } from '@/lib/fg/candleChange'
import { toneOf, type Tone } from '@/lib/fg/format'
import { formatManShares, formatRatio } from '@/lib/fg/stockQuote'
import { dayLabel } from '@/lib/fg/themeCharts'
import type { SupplyStreak, SupplyStreaks } from '@/lib/supplyStreak'

export type FlowMode = 'cum' | 'day'
export type FlowRange = '20' | '60' | '120'
export type Investor = 'foreign' | 'institution' | 'individual'

export const FLOW_FETCH_DAYS = 120
export const SUMMARY_FLOW_DAYS = 20
export const RECENT_FLOW_ROWS = 5
export const DEFAULT_FLOW_MODE: FlowMode = 'cum'
export const DEFAULT_FLOW_RANGE: FlowRange = '20'

export const FLOW_MODES: readonly { value: FlowMode; label: string }[] = [
  { value: 'cum', label: '누적' },
  { value: 'day', label: '일별' },
]

export const FLOW_RANGES: readonly { value: FlowRange; label: string; days: number }[] = [
  { value: '20', label: '20일', days: 20 },
  { value: '60', label: '60일', days: 60 },
  { value: '120', label: '120일', days: 120 },
]

export const INVESTORS: readonly { key: Investor; label: string }[] = [
  { key: 'foreign', label: '외국인' },
  { key: 'institution', label: '기관' },
  { key: 'individual', label: '개인' },
]

const DASH = '—'
const MINUS = '−'

export interface FlowDay {
  date: string
  foreign: number | null
  institution: number | null
  individual: number | null
  ratio: number | null
  close: number | null
  change: number | null
}

export type FlowTotal = Record<Investor, number>

export function formatShares(shares: number | null): string {
  return shares === null ? DASH : `${formatManShares(shares)}만 주`
}

export function formatAxisShares(man: number): string {
  const abs = Math.abs(man)
  const text = abs >= 10 ? Math.round(abs).toLocaleString('ko-KR') : abs.toFixed(1).replace(/\.0$/, '')
  return man < 0 && /[1-9]/.test(text) ? `${MINUS}${text}` : text
}

export function flowDays(flows: readonly InvestorFlowRes[], candles: readonly CandleRes[] | null): FlowDay[] {
  const index = new Map((candles ?? []).map((c, i) => [c.date, i]))
  return [...flows]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((flow) => {
      const at = index.get(flow.date)
      const candle = at === undefined || !candles ? null : candles[at]
      return {
        date: flow.date,
        foreign: flow.foreignNet,
        institution: flow.institutionNet,
        individual: flow.individualNet,
        ratio: flow.foreignRatio,
        close: candle?.close ?? null,
        change: at === undefined || !candles ? null : candleChangeAt(candles, at),
      }
    })
}

export function flowRangeOptions(total: number): (typeof FLOW_RANGES)[number][] {
  return FLOW_RANGES.filter((_, i) => i === 0 || FLOW_RANGES[i - 1].days < total)
}

export function flowWindow(days: readonly FlowDay[], range: FlowRange): FlowDay[] {
  const size = FLOW_RANGES.find((r) => r.value === range)?.days ?? days.length
  return days.slice(Math.max(0, days.length - size))
}

export function runningTotals(window: readonly FlowDay[]): FlowTotal[] {
  const acc: FlowTotal = { foreign: 0, institution: 0, individual: 0 }
  return window.map((day) => {
    for (const { key } of INVESTORS) acc[key] += day[key] ?? 0
    return { ...acc }
  })
}

export function sharedScale(window: readonly FlowDay[], totals: readonly FlowTotal[], mode: FlowMode): { lo: number; hi: number } {
  const values =
    mode === 'cum'
      ? totals.flatMap((t) => INVESTORS.map(({ key }) => t[key]))
      : window.flatMap((d) => INVESTORS.map(({ key }) => d[key] ?? 0))
  return { lo: Math.min(0, ...values), hi: Math.max(0, ...values) }
}

export function streakNote(streak: SupplyStreak): string {
  if (streak.direction === null || streak.days === 0) return ''
  return `${streak.direction === 'buy' ? '순매수' : '순매도'} ${streak.days}일째`
}

function clause(streak: SupplyStreak, end: boolean): string | null {
  if (streak.direction === null || streak.days === 0) return null
  const verb = streak.direction === 'buy' ? (end ? '샀어요.' : '사고') : end ? '팔았어요.' : '팔고'
  return streak.days > 1 ? `${streak.days}일 연속 ${verb}` : verb
}

export function flowLead(streaks: SupplyStreaks): string {
  const inst = clause(streaks.institution, true)
  const foreign = clause(streaks.foreign, inst === null)
  if (foreign && inst) {
    const same = streaks.foreign.direction === streaks.institution.direction
    return `외국인은 ${foreign}, 기관${same ? '도' : '은'} ${inst}`
  }
  if (foreign) return `외국인은 ${foreign}`
  if (inst) return `기관은 ${inst}`
  return ''
}

export function flowTail(window: readonly FlowDay[]): string | null {
  if (window.length === 0) return null
  const sum = window.reduce((acc, day) => acc + (day.individual ?? 0), 0)
  if (sum === 0) return null
  return `개인은 최근 ${window.length}일 동안 ${sum < 0 ? '판' : '산'} 주식이 더 많아요.`
}

export interface FlowReadingItem {
  key: Investor
  who: string
  value: string
  tone: Tone
  note: string
}

export interface FlowReading {
  when: string
  items: FlowReadingItem[]
}

interface FlowReadingInput {
  window: readonly FlowDay[]
  totals: readonly FlowTotal[]
  hover: number | null
  mode: FlowMode
  streaks: SupplyStreaks
  refYear: number
}

export function flowReading({ window, totals, hover, mode, streaks, refYear }: FlowReadingInput): FlowReading {
  if (window.length === 0) return { when: '', items: [] }
  const at = hover === null ? window.length - 1 : Math.max(0, Math.min(window.length - 1, hover))
  const day = window[at]
  const cum = mode === 'cum'
  return {
    when: cum ? `${dayLabel(day.date, refYear)}까지 ${at + 1}일 누적` : `${dayLabel(day.date, refYear)} 하루`,
    items: INVESTORS.map(({ key, label }) => {
      const value = cum ? totals[at][key] : day[key]
      let note = streakNote(streaks[key])
      if (hover !== null) note = cum ? `그날 ${formatShares(day[key])}` : ''
      return { key, who: label, value: formatShares(value), tone: toneOf(value), note }
    }),
  }
}

export function flowValueText(day: FlowDay, refYear: number): string {
  return [dayLabel(day.date, refYear), ...INVESTORS.map(({ key, label }) => `${label} ${formatShares(day[key])}`)].join(', ')
}

export function flowHelp(mode: FlowMode): string {
  const head = mode === 'cum' ? '기간 첫날부터 더한 순매수예요' : '하루 순매수예요'
  return `${head} · 빨강은 산 주식이 더 많고 파랑은 판 주식이 더 많아요 · 세 투자자는 같은 눈금 · 키보드 ← →`
}

export interface ForeignHolding {
  ratio: number | null
  change: number | null
}

export function foreignHolding(window: readonly FlowDay[]): ForeignHolding {
  const ratios = window.flatMap((day) => (day.ratio === null ? [] : [day.ratio]))
  if (ratios.length === 0) return { ratio: null, change: null }
  const ratio = ratios[ratios.length - 1]
  return { ratio, change: ratios.length < 2 ? null : ratio - ratios[0] }
}

export function holdingText(holding: ForeignHolding, days: number): string | null {
  if (holding.ratio === null) return null
  const base = `외국인 보유율 ${formatRatio(holding.ratio)}`
  return holding.change === null ? base : `${base} · 최근 ${days}일 동안 ${formatChange(holding.change)}p`
}

export function recentFlowRows(days: readonly FlowDay[], count = RECENT_FLOW_ROWS): FlowDay[] {
  return days.slice(Math.max(0, days.length - count)).reverse()
}

export function flowDateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return `${date.slice(5, 7)}.${date.slice(8, 10)} ${WEEKDAY_LABELS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}`
}

export interface ForeignSummaryValue {
  days: number
  total: number | null
  note: string
}

export function foreignSummary(days: readonly FlowDay[], streaks: SupplyStreaks): ForeignSummaryValue | null {
  if (days.length === 0) return null
  const window = days.slice(Math.max(0, days.length - SUMMARY_FLOW_DAYS))
  const present = window.flatMap((day) => (day.foreign === null ? [] : [day.foreign]))
  return {
    days: window.length,
    total: present.length === 0 ? null : present.reduce((a, b) => a + b, 0),
    note: streakNote(streaks.foreign),
  }
}

export function flowChangeText(change: number | null): string {
  return change === null ? DASH : formatChange(change)
}
