import type { ThemeLeaderRes, ThemeStockRes } from '@/lib/apiTypes'
import { compareNullLast } from '@/lib/themeMetrics'

export const MEMBER_TABLE_LIMIT = 10

export type MemberSortKey = 'price' | 'change' | 'r1m' | 'value' | 'cap'
export type SortDir = 'asc' | 'desc'

export interface MemberSort {
  key: MemberSortKey
  dir: SortDir
}

export const DEFAULT_MEMBER_SORT: MemberSort = { key: 'cap', dir: 'desc' }

export function nextMemberSort(current: MemberSort, key: MemberSortKey): MemberSort {
  if (current.key !== key) return { key, dir: 'desc' }
  return { key, dir: current.dir === 'desc' ? 'asc' : 'desc' }
}

export function memberAriaSort(sort: MemberSort, key: MemberSortKey): 'ascending' | 'descending' | 'none' {
  if (sort.key !== key) return 'none'
  return sort.dir === 'asc' ? 'ascending' : 'descending'
}

export function memberSortGlyph(sort: MemberSort, key: MemberSortKey): string {
  if (sort.key !== key) return ''
  return sort.dir === 'asc' ? ' ▲' : ' ▼'
}

const SORT_VALUE: Record<MemberSortKey, (stock: ThemeStockRes) => number | null | undefined> = {
  price: (stock) => stock.price,
  change: (stock) => stock.change,
  r1m: (stock) => stock.r1m,
  value: (stock) => stock.tradingValue,
  cap: (stock) => stock.marketCap,
}

export function sortMembers(stocks: readonly ThemeStockRes[], sort: MemberSort): ThemeStockRes[] {
  const value = SORT_VALUE[sort.key]
  return [...stocks].sort(
    (a, b) => compareNullLast(value(a), value(b), sort.dir === 'desc') || a.name.localeCompare(b.name, 'ko'),
  )
}

export function visibleMembers(sorted: readonly ThemeStockRes[], showAll: boolean): ThemeStockRes[] {
  return showAll ? [...sorted] : sorted.slice(0, MEMBER_TABLE_LIMIT)
}

export type MarketFilter = 'all' | 'kospi' | 'kosdaq'

const MARKET_CODE: Record<Exclude<MarketFilter, 'all'>, string> = { kospi: 'KOSPI', kosdaq: 'KOSDAQ' }

export function filterMarket(stocks: readonly ThemeStockRes[], market: MarketFilter): ThemeStockRes[] {
  if (market === 'all') return [...stocks]
  return stocks.filter((stock) => stock.market === MARKET_CODE[market])
}

export function marketCounts(stocks: readonly ThemeStockRes[]): Record<MarketFilter, number> {
  return {
    all: stocks.length,
    kospi: filterMarket(stocks, 'kospi').length,
    kosdaq: filterMarket(stocks, 'kosdaq').length,
  }
}

function isDelisting(stock: ThemeStockRes): boolean {
  return stock.changeStatus === 'DELISTING'
}

export function delistingCount(stocks: readonly ThemeStockRes[]): number {
  return stocks.filter(isDelisting).length
}

export function marketMix(stocks: readonly ThemeStockRes[]): string {
  const counts = marketCounts(stocks.filter((stock) => !isDelisting(stock)))
  return `코스피 ${counts.kospi} · 코스닥 ${counts.kosdaq}`
}

const SORT_LABELS: Record<MemberSortKey, Record<SortDir, string>> = {
  price: { desc: '현재가 높은 순', asc: '현재가 낮은 순' },
  change: { desc: '등락률 높은 순', asc: '등락률 낮은 순' },
  r1m: { desc: '1달 수익률 높은 순', asc: '1달 수익률 낮은 순' },
  value: { desc: '거래대금 많은 순', asc: '거래대금 적은 순' },
  cap: { desc: '시가총액 큰 순', asc: '시가총액 작은 순' },
}

export function memberSortLabel(sort: MemberSort): string {
  return SORT_LABELS[sort.key][sort.dir]
}

const MARKET_PREFIX: Record<MarketFilter, string> = { all: '', kospi: '코스피 ', kosdaq: '코스닥 ' }

export function memberCaption(market: MarketFilter, count: number, sort: MemberSort, delisting = 0): string {
  const note = delisting > 0 ? ` · 정리매매 ${delisting}` : ''
  return `${MARKET_PREFIX[market]}${count}종목${note} · ${memberSortLabel(sort)} · 테마 포함 사유는 테마 출처의 설명을 그대로 옮겼어요`
}

export function capWeight(cap: number | null, total: number | null): number | null {
  if (cap === null || total === null || total <= 0) return null
  return (cap / total) * 100
}

export function formatWeight(percent: number | null): string {
  return percent === null ? '—' : `${percent.toFixed(1)}%`
}

export function volumeRatioNote(ratio: number | null | undefined): string | null {
  if (ratio === null || ratio === undefined) return null
  return `20일 평균의 ${ratio.toFixed(1)}배`
}

export interface LeaderRow {
  ticker: string
  name: string
  change: number
  price: number | null
}

export function todayLeaders(
  leaders: readonly ThemeLeaderRes[] | undefined,
  stocks: readonly ThemeStockRes[] | null,
): LeaderRow[] {
  const prices = new Map((stocks ?? []).map((stock) => [stock.ticker, stock.price]))
  return (leaders ?? []).flatMap((leader) =>
    leader.change === null
      ? []
      : [{ ticker: leader.ticker, name: leader.name, change: leader.change, price: prices.get(leader.ticker) ?? null }],
  )
}
