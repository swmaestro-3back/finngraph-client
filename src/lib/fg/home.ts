import type { FavoriteItemRes, IssueSort, IssueSummaryRes, StockRowRes, ThemeRes } from '@/lib/apiTypes'
import type { HubThemeIssues } from '@/lib/fg/hub'
import { dayWord } from '@/lib/fg/issueSubject'

export const FEED_PAGE_SIZE = 5
export const FEED_STOCK_CHIPS = 3
export const FEED_THEME_CHIPS = 5
export const RAIL_MOVERS = 4
export const WATCH_ROWS = 5
export const HOME_STOCK_ROWS = 10
export const DEFAULT_FEED_SORT: IssueSort = 'media'

export const FEED_SORTS: readonly { value: IssueSort; label: string }[] = [
  { value: 'recent', label: '최신순' },
  { value: 'media', label: '매체 많은 순' },
]

export function parseFeedSort(search: string): IssueSort {
  const raw = new URLSearchParams(search).get('sort')
  return FEED_SORTS.find((option) => option.value === raw)?.value ?? DEFAULT_FEED_SORT
}

export function feedSortSearch(search: string, sort: IssueSort): string {
  const params = new URLSearchParams(search)
  params.delete('sort')
  if (sort !== DEFAULT_FEED_SORT) params.set('sort', sort)
  const text = params.toString()
  return text ? `?${text}` : ''
}

export interface FeedChunk {
  date: string | null
  page: number
  totalPages: number
  prevDate: string | null
  items: readonly IssueSummaryRes[]
}

export interface FeedRequest {
  date: string | null
  page: number
}

export function nextFeedRequest(chunks: readonly FeedChunk[], crossDates: boolean): FeedRequest | null {
  const first = chunks[0]
  const last = chunks[chunks.length - 1]
  if (!first || !last) return { date: null, page: 0 }
  if (!crossDates && last.date !== first.date) return null
  if (last.page + 1 < last.totalPages) return { date: last.date, page: last.page + 1 }
  if (!crossDates || last.prevDate === null) return null
  return { date: last.prevDate, page: 0 }
}

export interface FeedGroup {
  date: string | null
  items: IssueSummaryRes[]
}

export function feedGroups(chunks: readonly FeedChunk[]): FeedGroup[] {
  const seen = new Set<number>()
  const groups: FeedGroup[] = []
  for (const chunk of chunks) {
    const fresh = chunk.items.filter((item) => !seen.has(item.id))
    if (fresh.length === 0) continue
    for (const item of fresh) seen.add(item.id)
    const tail = groups[groups.length - 1]
    if (tail && tail.date === chunk.date) tail.items.push(...fresh)
    else groups.push({ date: chunk.date, items: [...fresh] })
  }
  return groups
}

export type FeedFilter = { kind: 'all' } | { kind: 'fav' } | { kind: 'theme'; id: number }

export const ALL_FILTER: FeedFilter = { kind: 'all' }

export interface FilterContext {
  favorites: ReadonlySet<string>
  themeIssueIds: ReadonlySet<string> | null
}

function keepNonEmpty(groups: FeedGroup[]): FeedGroup[] {
  return groups.filter((group) => group.items.length > 0)
}

export function filterGroups(groups: FeedGroup[], filter: FeedFilter, context: FilterContext): FeedGroup[] {
  if (filter.kind === 'all') return groups
  if (filter.kind === 'fav') {
    return keepNonEmpty(
      groups.map((group) => ({
        date: group.date,
        items: group.items.filter((item) => item.companies.some((company) => context.favorites.has(company.ticker))),
      })),
    )
  }
  const ids = context.themeIssueIds
  const first = groups[0]
  if (!ids || !first) return []
  return keepNonEmpty([{ date: first.date, items: first.items.filter((item) => ids.has(String(item.id))) }])
}

export function chipThemes(
  themes: readonly ThemeRes[],
  issues: ReadonlyMap<number, HubThemeIssues> | null,
  limit = FEED_THEME_CHIPS,
): ThemeRes[] {
  if (!issues) return []
  const countOf = (theme: ThemeRes) => issues.get(theme.id)?.count ?? 0
  return themes
    .map((theme, index) => ({ theme, index, count: countOf(theme) }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.theme)
}

export function resolveFilter(filter: FeedFilter, chips: readonly ThemeRes[], member: boolean): FeedFilter {
  if (filter.kind === 'fav') return member ? filter : ALL_FILTER
  if (filter.kind === 'theme') return chips.some((theme) => theme.id === filter.id) ? filter : ALL_FILTER
  return filter
}

export function timelineBadge(count: number): string {
  return count <= 1 ? '새 이슈' : `타임라인 ${count}번째`
}

export function moreLabel(request: FeedRequest, lastDate: string | null, today: string): string {
  if (request.date === lastDate || request.date === null) return '이슈 더 보기'
  return `${dayWord(request.date, today)} 이슈 보기`
}

export function splitChips<T>(items: readonly T[], limit: number): { shown: T[]; extra: number } {
  return { shown: items.slice(0, limit), extra: Math.max(0, items.length - limit) }
}

export interface WatchRow {
  ticker: string
  name: string
  market: string
  price: number | null
  change: number | null
}

export function watchRows(
  items: readonly FavoriteItemRes[],
  quotes: ReadonlyMap<string, StockRowRes> | null,
  limit = WATCH_ROWS,
): { rows: WatchRow[]; total: number } {
  const stocks = items.flatMap((item) => (item.type === 'STOCK' && item.resolved && item.stock ? [item.stock] : []))
  const rows = stocks.slice(0, limit).map((stock) => {
    const quote = quotes?.get(stock.ticker) ?? null
    const live = quote !== null && quote.price !== null
    return {
      ticker: stock.ticker,
      name: stock.name,
      market: stock.market,
      price: live ? quote.price : stock.price,
      change: live ? quote.change : stock.change,
    }
  })
  return { rows, total: stocks.length }
}
