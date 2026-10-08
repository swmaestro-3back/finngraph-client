import type { CandleRes, IssueCompanyRes, StockIssueRes } from '@/lib/apiTypes'
import { addDays, daysBetween } from '@/lib/calendar'
import { candleChangeAt } from '@/lib/fg/candleChange'
import { issueTitle } from '@/lib/fg/hub'
import { volumeRatio } from '@/lib/fg/priceChart'
import { dayLabel } from '@/lib/fg/themeCharts'
import { kstDayTime } from '@/lib/fg/themeNews'

export interface IssueFixture {
  date: string
  title: string
  media: number
  articles: number
  summary: string
  with?: readonly string[]
  more?: number
}

export interface IssueFlowFixture {
  id: string
  title: string
  issues: readonly IssueFixture[]
}

export interface IssueFlowsFixture {
  anchor: string
  flows: readonly IssueFlowFixture[]
}

export interface PlacedIssue {
  key: string
  flowId: string
  flowTitle: string
  order: number
  total: number
  date: string
  index: number
  sameDay: boolean
  change: number | null
  close: number
  volumeRatio: number | null
  title: string
  media: number
  articles: number
  summary: string
  with: readonly string[]
  more: number
}

export const RECENT_ISSUE_COUNT = 5

export function placeIssues(fixture: IssueFlowsFixture, candles: readonly CandleRes[]): PlacedIssue[] {
  if (candles.length === 0) return []
  const first = candles[0].date
  const shift = daysBetween(fixture.anchor, candles[candles.length - 1].date)
  const placed = fixture.flows.flatMap((flow) =>
    flow.issues.flatMap((issue, k): PlacedIssue[] => {
      const date = addDays(issue.date, shift)
      const index = candles.findIndex((candle) => candle.date >= date)
      if (date < first || index < 0) return []
      const candle = candles[index]
      return [
        {
          key: `${flow.id}-${k}`,
          flowId: flow.id,
          flowTitle: flow.title,
          order: k + 1,
          total: flow.issues.length,
          date,
          index,
          sameDay: candle.date === date,
          change: candleChangeAt(candles, index),
          close: candle.close,
          volumeRatio: volumeRatio(candles, index),
          title: issue.title,
          media: issue.media,
          articles: issue.articles,
          summary: issue.summary,
          with: issue.with ?? [],
          more: issue.more ?? 0,
        },
      ]
    }),
  )
  return placed.sort((a, b) => b.date.localeCompare(a.date))
}

export interface MarkerItem {
  key: string
  index: number
  stack: number
}

export interface DayMarker extends MarkerItem {
  count: number
}

export interface DayMarkers {
  markers: DayMarker[]
  markerOf: ReadonlyMap<string, string>
}

export function dayMarkers(issues: readonly Pick<PlacedIssue, 'key' | 'index'>[]): DayMarkers {
  const byIndex = new Map<number, DayMarker>()
  const markerOf = new Map<string, string>()
  for (const issue of issues) {
    let marker = byIndex.get(issue.index)
    if (marker) marker.count += 1
    else {
      marker = { key: issue.key, index: issue.index, stack: 0, count: 1 }
      byIndex.set(issue.index, marker)
    }
    markerOf.set(issue.key, marker.key)
  }
  return { markers: [...byIndex.values()], markerOf }
}

export const STOCK_ISSUE_ORDER = '처음 보도된 날 최신순'

export function shortDate(date: string): string {
  return `${date.slice(5, 7)}.${date.slice(8, 10)}`
}

export function issueDayLabel(date: string, today: string): string {
  return date === today ? '오늘' : shortDate(date)
}

export function issueBadge(issue: Pick<PlacedIssue, 'order' | 'total'>): string {
  return issue.total > 1 ? `타임라인 ${issue.order}번째` : '새 이슈'
}

export function tradingDayLabel(issue: Pick<PlacedIssue, 'sameDay'>): string {
  return issue.sameDay ? '이 날' : '다음 거래일'
}

export function reportedLabel(issue: Pick<PlacedIssue, 'date' | 'total' | 'flowTitle'>, refYear: number): string {
  const flow = issue.total > 1 ? ` · ${issue.flowTitle} 흐름` : ''
  return `${dayLabel(issue.date, refYear)} 보도${flow}`
}

export function flowSteps(placed: readonly PlacedIssue[], flowId: string): PlacedIssue[] {
  return placed.filter((issue) => issue.flowId === flowId).sort((a, b) => a.order - b.order)
}

export interface StockIssueEvent {
  key: string
  id: string
  date: string
  lastDate: string
  index: number | null
  sameDay: boolean
  change: number | null
  volumeRatio: number | null
  title: string
  summary: string | null
  media: number
  articles: number
  mentions: number
  companies: readonly IssueCompanyRes[]
}

export function tradeIndexOf(candles: readonly Pick<CandleRes, 'date'>[], day: string): number | null {
  if (candles.length === 0 || day < candles[0].date || day > candles[candles.length - 1].date) return null
  let lo = 0
  let hi = candles.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (candles[mid].date < day) lo = mid + 1
    else hi = mid
  }
  return lo
}

export function placeStockIssues(items: readonly StockIssueRes[], candles: readonly CandleRes[]): StockIssueEvent[] {
  const events = items.flatMap((item): StockIssueEvent[] => {
    const date = kstDayTime(item.firstPublishedAt ?? item.lastPublishedAt ?? '')?.day
    if (!date) return []
    const lastDate = kstDayTime(item.lastPublishedAt ?? '')?.day ?? date
    const index = tradeIndexOf(candles, date)
    return [
      {
        key: String(item.id),
        id: String(item.id),
        date,
        lastDate: lastDate < date ? date : lastDate,
        index,
        sameDay: index !== null && candles[index].date === date,
        change: index === null ? null : candleChangeAt(candles, index),
        volumeRatio: index === null ? null : volumeRatio(candles, index),
        title: issueTitle(item),
        summary: item.summary?.trim() || null,
        media: item.mediaCount,
        articles: item.articleCount,
        mentions: item.mentionCount,
        companies: item.companies,
      },
    ]
  })
  return events.sort(
    (a, b) => b.date.localeCompare(a.date) || b.lastDate.localeCompare(a.lastDate) || Number(b.id) - Number(a.id),
  )
}

export function issueSpanLabel(event: Pick<StockIssueEvent, 'date' | 'lastDate'>, today: string): string {
  const first = issueDayLabel(event.date, today)
  return event.lastDate > event.date ? `${first} → ${issueDayLabel(event.lastDate, today)}` : first
}
