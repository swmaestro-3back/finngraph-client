import { useMemo } from 'react'
import type { GapId } from '@/lib/dataGaps'
import {
  HUB_PAST_LIMIT,
  issueNode,
  issueRef,
  themeIssueSet,
  type HubFixture,
  type HubIssueRef,
  type HubThemeIssues,
  type HubTimeline,
} from '@/lib/fg/hub'
import { placeStockIssues } from '@/lib/fg/stockIssues'
import { useKeyed } from '@/lib/queries/useKeyed'
import {
  loadLatestIssues,
  loadStockIssues,
  loadThemeIssues,
  STOCK_ISSUE_LIMIT,
  themeIssueKey,
} from '@/lib/queries/useStockIssues'
import { useGap } from '@/lib/useGap'

const loadHub = import.meta.env.DEV ? () => import('@/dev/fixtures/home').then((m) => m.hubFixture) : null

export type HubSlot<T> =
  | { status: 'not-ready'; gap: GapId }
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; data: T; mock: boolean }

const LOADING = { status: 'loading' } as const

const TIMELINE_NODES = HUB_PAST_LIMIT + 1

export function useHubFixture(gap: GapId): HubFixture | null {
  const state = useGap(gap, loadHub)
  return state.status === 'mock' ? state.data : null
}

function loadLines(key: string) {
  return loadLatestIssues(key.split(','))
}

export function useStockIssueLines(tickers: readonly string[]): HubSlot<ReadonlyMap<string, HubIssueRef | null>> {
  const key = tickers.join(',')
  const { data, error, retry } = useKeyed(key === '' ? null : key, loadLines)
  return useMemo(() => {
    if (key === '') return { status: 'ready', data: new Map(), mock: false }
    if (data) {
      const lines = new Map([...data].map(([ticker, issue]) => [ticker, issue ? issueRef(issue) : null] as const))
      return { status: 'ready', data: lines, mock: false }
    }
    if (error) return { status: 'error', retry }
    return LOADING
  }, [key, data, error, retry])
}

export function useStockIssueLine(ticker: string | null): HubSlot<HubIssueRef | null> {
  const lines = useStockIssueLines(ticker === null ? [] : [ticker])
  return useMemo(() => {
    if (lines.status !== 'ready') return lines
    return { status: 'ready', data: ticker === null ? null : (lines.data.get(ticker) ?? null), mock: false }
  }, [lines, ticker])
}

function loadTimeline(ticker: string) {
  return loadStockIssues(ticker, STOCK_ISSUE_LIMIT)
}

export function useStockTimeline(ticker: string | null): HubSlot<HubTimeline> {
  const fixture = useHubFixture('stock-issues')
  const { data, error, retry } = useKeyed(ticker, loadTimeline)
  return useMemo(() => {
    if (ticker === null) return LOADING
    if (data) {
      const flow = fixture ? fixture.stockFlow(ticker) : null
      const nodes = placeStockIssues(data.items, [])
        .slice(0, TIMELINE_NODES)
        .map((event) => ({ id: event.id, title: event.title, summary: event.summary, day: event.date, media: event.media }))
      return { status: 'ready', data: { flow, nodes }, mock: false }
    }
    if (error) return { status: 'error', retry }
    return LOADING
  }, [ticker, fixture, data, error, retry])
}

export function useThemeTimeline(themeId: number | null): HubSlot<HubTimeline> {
  const { data, error, retry } = useKeyed(themeId === null ? null : themeIssueKey([themeId], null), loadThemeIssues)
  return useMemo(() => {
    if (themeId === null) return LOADING
    if (data) {
      const issues = data.themes.get(themeId)?.issues ?? []
      return { status: 'ready', data: { flow: null, nodes: issues.map((item) => issueNode(item, data.date)) }, mock: false }
    }
    if (error) return { status: 'error', retry }
    return LOADING
  }, [themeId, data, error, retry])
}

export function useThemeIssues(
  themeIds: readonly number[],
  date: string | null,
): HubSlot<ReadonlyMap<number, HubThemeIssues>> {
  const key = themeIssueKey(themeIds, date)
  const { data, error, retry } = useKeyed(key, loadThemeIssues)
  const ids = themeIds.join(',')
  return useMemo(() => {
    if (key === null) return { status: 'ready', data: new Map(), mock: false }
    if (data) {
      const issues = new Map(
        ids
          .split(',')
          .filter(Boolean)
          .map((raw) => [Number(raw), themeIssueSet(data.themes.get(Number(raw)))] as const),
      )
      return { status: 'ready', data: issues, mock: false }
    }
    if (error) return { status: 'error', retry }
    return LOADING
  }, [key, ids, data, error, retry])
}
