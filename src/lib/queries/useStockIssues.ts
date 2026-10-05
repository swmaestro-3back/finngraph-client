import { getData, getDataMeta, getPage } from '@/lib/api'
import type { LatestStockIssueRes, StockIssueRes, ThemeIssuesMeta, ThemeIssuesRes } from '@/lib/apiTypes'
import { createTtlCache } from '@/lib/queries/ttlCache'
import { useKeyed, type KeyedState } from '@/lib/queries/useKeyed'

const ISSUE_TTL_MS = 60_000
const BATCH_LIMIT = 50

export const STOCK_ISSUE_LIMIT = 100

export interface StockIssuePage {
  items: StockIssueRes[]
  total: number
}

export interface ThemeIssueBoard {
  date: string | null
  themes: ReadonlyMap<number, ThemeIssuesRes>
}

interface ThemeIssuesPart {
  data: ThemeIssuesRes[]
  meta: ThemeIssuesMeta | null
}

const stockIssues = createTtlCache<StockIssuePage>(ISSUE_TTL_MS)
const latestIssues = createTtlCache<LatestStockIssueRes[]>(ISSUE_TTL_MS)
const themeIssues = createTtlCache<ThemeIssuesPart>(ISSUE_TTL_MS)

function batches<T>(items: readonly T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += BATCH_LIMIT) out.push(items.slice(i, i + BATCH_LIMIT))
  return out
}

export function loadStockIssues(ticker: string, size: number): Promise<StockIssuePage> {
  return stockIssues(`${ticker}:${size}`, () =>
    getPage<StockIssueRes>(`/v1/stocks/${ticker}/issues`, 0, size).then(({ items, pagination }) => ({
      items,
      total: pagination.totalElements,
    })),
  )
}

export function useStockIssues(ticker: string | null, size = STOCK_ISSUE_LIMIT): KeyedState<StockIssuePage> {
  return useKeyed(ticker === null ? null : `${ticker}:${size}`, (key) => {
    const [code, count] = key.split(':')
    return loadStockIssues(code, Number(count))
  })
}

export function loadLatestIssues(tickers: readonly string[]): Promise<ReadonlyMap<string, StockIssueRes | null>> {
  const unique = [...new Set(tickers)]
  return Promise.all(
    batches(unique).map((part) => {
      const joined = part.join(',')
      return latestIssues(joined, () => getData<LatestStockIssueRes[]>('/v1/stocks/issues/latest', { tickers: joined }))
    }),
  ).then((parts) => new Map(parts.flat().map((entry) => [entry.ticker, entry.issue])))
}

export function themeIssueKey(ids: readonly number[], date: string | null): string | null {
  const unique = [...new Set(ids)].sort((a, b) => a - b)
  return unique.length === 0 ? null : `${date ?? ''}|${unique.join(',')}`
}

export function loadThemeIssues(key: string): Promise<ThemeIssueBoard> {
  const [rawDate, list] = key.split('|')
  const date = rawDate || null
  const ids = list.split(',').map(Number)
  return Promise.all(
    batches(ids).map((part) => {
      const joined = part.join(',')
      return themeIssues(`${rawDate}|${joined}`, () =>
        getDataMeta<ThemeIssuesRes[], ThemeIssuesMeta>('/v1/themes/issues', { ids: joined, date: date ?? undefined }),
      )
    }),
  ).then((parts) => ({
    date: parts[0]?.meta?.date ?? date,
    themes: new Map(parts.flatMap((part) => part.data).map((entry) => [entry.themeId, entry])),
  }))
}

export function useThemeIssueBoard(ids: readonly number[], date: string | null): KeyedState<ThemeIssueBoard> {
  return useKeyed(themeIssueKey(ids, date), loadThemeIssues)
}
