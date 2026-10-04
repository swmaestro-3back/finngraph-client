import type { CandleRes } from '@/lib/apiTypes'
import { daysBetween } from '@/lib/calendar'
import { formatChange } from '@/lib/format'
import { shortDate, type PlacedIssue } from '@/lib/fg/stockIssues'
import { minusMonths, monthDayLabel } from '@/lib/fg/themeCharts'

export type FlowPeriod = '1m' | '3m' | '6m' | '1y'
export type FlowSort = 'recent' | 'hot'
export type FlowOrder = 'time' | 'new'

export const FLOW_PERIODS: readonly { value: FlowPeriod; label: string; months: number }[] = [
  { value: '1m', label: '1달', months: 1 },
  { value: '3m', label: '3달', months: 3 },
  { value: '6m', label: '6달', months: 6 },
  { value: '1y', label: '1년', months: 12 },
]

export const FLOW_SORTS: readonly { value: FlowSort; label: string }[] = [
  { value: 'recent', label: '최근 순' },
  { value: 'hot', label: '화제 순' },
]

export const FLOW_ORDERS: readonly { value: FlowOrder; label: string }[] = [
  { value: 'time', label: '시간순' },
  { value: 'new', label: '최신순' },
]

export const DEFAULT_FLOW_PERIOD: FlowPeriod = '3m'
export const LIVE_DAYS = 7
const LEAD_BARS = 4
const TAIL_BARS = 6
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const
const SORT_CAPTION: Record<FlowSort, string> = { recent: '최근 보도 순', hot: '매체 많은 흐름 순' }

export interface IssueFlow {
  id: string
  title: string
  items: PlacedIssue[]
  first: PlacedIssue
  last: PlacedIssue
  live: boolean
  daysAgo: number
  fromIndex: number
  toIndex: number
  fromClose: number
  toClose: number
  toDate: string
  change: number | null
  maxMedia: number
}

export function issueFlows(placed: readonly PlacedIssue[], candles: readonly CandleRes[], today: string): IssueFlow[] {
  if (candles.length === 0) return []
  const groups = new Map<string, PlacedIssue[]>()
  for (const issue of placed) {
    const group = groups.get(issue.flowId)
    if (group) group.push(issue)
    else groups.set(issue.flowId, [issue])
  }
  return [...groups.values()].map((group) => {
    const items = [...group].sort((a, b) => a.order - b.order)
    const first = items[0]
    const last = items[items.length - 1]
    const daysAgo = daysBetween(last.date, today)
    const live = daysAgo <= LIVE_DAYS
    const fromIndex = Math.max(0, first.index - 1)
    const toIndex = live ? candles.length - 1 : last.index
    const fromClose = candles[fromIndex].close
    const toClose = candles[toIndex].close
    return {
      id: first.flowId,
      title: first.flowTitle,
      items,
      first,
      last,
      live,
      daysAgo,
      fromIndex,
      toIndex,
      fromClose,
      toClose,
      toDate: candles[toIndex].date,
      change: fromClose > 0 ? (toClose / fromClose - 1) * 100 : null,
      maxMedia: Math.max(...items.map((item) => item.media)),
    }
  })
}

function periodInfo(period: FlowPeriod) {
  return FLOW_PERIODS.find((p) => p.value === period) ?? FLOW_PERIODS[1]
}

function inPeriod(flow: IssueFlow, period: FlowPeriod, today: string): boolean {
  return flow.last.date >= minusMonths(today, periodInfo(period).months)
}

function matches(flow: IssueFlow, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return flow.title.toLowerCase().includes(q) || flow.items.some((item) => item.title.toLowerCase().includes(q))
}

export interface FlowFilter {
  period: FlowPeriod
  sort: FlowSort
  query: string
  today: string
}

export function visibleFlows(flows: readonly IssueFlow[], { period, sort, query, today }: FlowFilter): IssueFlow[] {
  const recent = (a: IssueFlow, b: IssueFlow) => b.last.date.localeCompare(a.last.date)
  return flows
    .filter((flow) => inPeriod(flow, period, today) && matches(flow, query))
    .sort(sort === 'hot' ? (a, b) => b.maxMedia - a.maxMedia || recent(a, b) : recent)
}

export interface WidenOffer {
  next: FlowPeriod
  text: string
  label: string
}

export function widenOffer(
  flows: readonly IssueFlow[],
  period: FlowPeriod,
  query: string,
  shown: number,
  today: string,
): WidenOffer | null {
  if (query.trim()) return null
  const start = FLOW_PERIODS.findIndex((p) => p.value === period)
  for (const next of FLOW_PERIODS.slice(start + 1)) {
    const more = flows.filter((flow) => inPeriod(flow, next.value, today)).length - shown
    if (more > 0) return { next: next.value, text: `더 지난 흐름 ${more}개가 ${next.label} 안에 있어요`, label: `${next.label}까지 보기` }
  }
  return null
}

export function flowCaption(count: number, period: FlowPeriod, sort: FlowSort, query: string): string {
  const q = query.trim()
  return `흐름 ${count}개 · 최근 ${periodInfo(period).label} · ${SORT_CAPTION[sort]}${q ? ` · "${q}" 검색` : ''}`
}

function lastLabel(flow: IssueFlow, today: string, short: boolean): string {
  if (flow.last.date === today) return '오늘'
  return short ? shortDate(flow.last.date) : monthDayLabel(flow.last.date, Number(today.slice(0, 4)))
}

export function flowSpan(flow: IssueFlow, today: string): string {
  if (flow.items.length < 2) return shortDate(flow.first.date)
  return `${shortDate(flow.first.date)} → ${lastLabel(flow, today, true)}`
}

export function flowMediaLabel(flow: IssueFlow): string {
  return flow.items.length < 2 ? `매체 ${flow.first.media}곳` : `매체 ${flow.first.media}곳 → ${flow.last.media}곳`
}

export function flowStatus(flow: IssueFlow, today: string): string {
  if (flow.live) return flow.last.date === today ? '오늘도 보도' : `${flow.daysAgo}일 전 보도`
  return `${monthDayLabel(flow.last.date, Number(today.slice(0, 4)))} 이후 소식 없음`
}

export function flowMeta(flow: IssueFlow, today: string): string {
  const refYear = Number(today.slice(0, 4))
  const start = monthDayLabel(flow.first.date, refYear)
  if (flow.items.length < 2) return `${start} · ${flowMediaLabel(flow)}`
  const days = daysBetween(flow.first.date, flow.last.date) + 1
  return `${start} → ${lastLabel(flow, today, false)} · ${days}일 · ${flowMediaLabel(flow)}`
}

export function flowCompareNote(flow: IssueFlow, today: string): string {
  const end = flow.live ? (flow.toDate === today ? '오늘' : '최근 거래일') : '마지막 이슈 날'
  return `첫 보도 전날 종가와 ${end} 종가를 비교했어요`
}

export function flowListTitle(flow: IssueFlow, order: FlowOrder): string {
  const n = flow.items.length
  return n > 1 ? `이슈 ${n}개를 ${order === 'time' ? '시간순' : '최신순'}으로` : '이 흐름의 이슈'
}

export function flowChartLabel(flow: IssueFlow, stockName: string): string {
  return `${flow.title} 흐름 동안 ${stockName} 주가${flow.change === null ? '' : `, ${formatChange(flow.change)}`}`
}

export function flowChartWindow(flow: IssueFlow, count: number): { from: number; to: number } {
  return {
    from: Math.max(0, flow.fromIndex - LEAD_BARS),
    to: Math.min(count - 1, flow.toIndex + (flow.live ? 0 : TAIL_BARS)),
  }
}

export interface TimelineNode {
  issue: PlacedIssue
  dateText: string
  dateSub: string
  badge: string
  now: boolean
  since: { days: number; change: number | null } | null
}

function weekdayOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

export function timelineNodes(
  flow: IssueFlow,
  order: FlowOrder,
  candles: readonly CandleRes[],
  today: string,
): TimelineNode[] {
  const n = flow.items.length
  const items = order === 'time' ? flow.items : [...flow.items].reverse()
  return items.map((issue, j) => {
    const prev = order === 'time' && j > 0 ? items[j - 1] : null
    const before = prev ? candles[prev.index]?.close ?? 0 : 0
    const after = candles[issue.index]?.close ?? 0
    const isToday = issue.date === today
    return {
      issue,
      dateText: isToday ? '오늘' : shortDate(issue.date),
      dateSub: isToday ? shortDate(issue.date) : `${weekdayOf(issue.date)}요일`,
      badge: n > 1 ? (issue.order === 1 ? '첫 보도' : `타임라인 ${issue.order}번째`) : '새 이슈',
      now: flow.live && issue.key === flow.last.key,
      since: prev
        ? { days: daysBetween(prev.date, issue.date), change: before > 0 ? (after / before - 1) * 100 : null }
        : null,
    }
  })
}
