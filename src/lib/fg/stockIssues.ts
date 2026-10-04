import type { CandleRes } from '@/lib/apiTypes'
import { addDays, daysBetween } from '@/lib/calendar'
import { volumeRatio } from '@/lib/fg/priceChart'
import { dayLabel } from '@/lib/fg/themeCharts'

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
      const prev = candles[index - 1]
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
          change: prev && prev.close > 0 ? (candle.close / prev.close - 1) * 100 : null,
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

export function stackMarkers(issues: readonly PlacedIssue[]): MarkerItem[] {
  const seen = new Map<number, number>()
  return issues.map((issue) => {
    const stack = seen.get(issue.index) ?? 0
    seen.set(issue.index, stack + 1)
    return { key: issue.key, index: issue.index, stack }
  })
}

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
