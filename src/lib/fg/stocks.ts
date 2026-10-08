import type { StockRowRes, ThemeStockRes, ThemeTickersRes } from '@/lib/apiTypes'
import { readPage, writePage } from '@/lib/listParams'
import {
  applyStockFilters,
  filterFromParams,
  filterToParams,
  type FilterContext,
  type FilterState,
  type PresetKey,
} from '@/lib/stockFilter'
import { compareNullLast } from '@/lib/themeMetrics'

export type StockMarket = FilterState['market']
export type StockSort = 'cap' | 'value' | 'rise' | 'fall'
export type StockColumn = 'change' | 'value' | 'cap'
export type AriaSort = 'ascending' | 'descending'

export const STOCK_PAGE_SIZE = 50

export interface StockQuery {
  market: StockMarket
  presets: readonly PresetKey[]
  fav: boolean
  sort: StockSort | null
  page: number | null
  code: string | null
  ranges: FilterState['ranges']
  themeId: number | null
  themeQ: string | null
  nameQ: string | null
}

export type ValueOf = (stock: StockRowRes) => number | null

const SORTS: readonly StockSort[] = ['cap', 'value', 'rise', 'fall']

export const STOCK_SORT_LABEL: Record<StockSort, string> = {
  cap: '시가총액 큰 순',
  value: '거래대금 많은 순',
  rise: '상승률 높은 순',
  fall: '하락률 높은 순',
}

export function parseStockCode(raw: string | null | undefined): string | null {
  return raw && /^[0-9A-Z]{6}$/.test(raw) ? raw : null
}

export function parseStockQuery(search: string): StockQuery {
  const params = new URLSearchParams(search)
  const filter = filterFromParams(params)
  const sort = SORTS.find((value) => value === params.get('sort')) ?? null
  const page = readPage(params)
  return {
    market: filter.market,
    presets: [...filter.presets],
    fav: params.get('fav') === '1',
    sort: sort === 'cap' ? null : sort,
    page: page > 1 ? page : null,
    code: parseStockCode(params.get('code')),
    ranges: filter.ranges,
    themeId: filter.themeId ?? null,
    themeQ: filter.themeQ ?? null,
    nameQ: filter.nameQ ?? null,
  }
}

export function stockQueryString(query: StockQuery): string {
  const params = new URLSearchParams()
  filterToParams(
    {
      market: query.market,
      presets: new Set(query.presets),
      ranges: query.ranges,
      themeId: query.themeId,
      themeQ: query.themeQ,
      nameQ: query.nameQ,
    },
    params,
  )
  if (query.fav) params.set('fav', '1')
  if (query.sort && query.sort !== 'cap') params.set('sort', query.sort)
  writePage(params, query.page ?? 1)
  if (query.code) params.set('code', query.code)
  const text = params.toString()
  return text ? `?${text}` : ''
}

export function resolveStockSort(requested: StockSort | null, valueReady: boolean): StockSort {
  if (requested === null || (requested === 'value' && !valueReady)) return 'cap'
  return requested
}

export function sortStocks(rows: readonly StockRowRes[], sort: StockSort, valueOf: ValueOf): StockRowRes[] {
  const key = (stock: StockRowRes): number | null => {
    if (sort === 'cap') return stock.marketCap
    if (sort === 'value') return valueOf(stock)
    return stock.change
  }
  const desc = sort !== 'fall'
  return [...rows].sort((a, b) => compareNullLast(key(a), key(b), desc) || a.name.localeCompare(b.name, 'ko'))
}

export function filterStocks(
  rows: readonly StockRowRes[],
  query: Pick<StockQuery, 'market' | 'presets' | 'ranges' | 'themeId' | 'themeQ' | 'nameQ'>,
  favOnly: boolean,
  isFavorite: (ticker: string) => boolean,
  context: FilterContext = {},
): StockRowRes[] {
  const filtered = applyStockFilters(
    [...rows],
    {
      market: favOnly ? 'ALL' : query.market,
      presets: new Set(query.presets),
      ranges: query.ranges,
      themeId: query.themeId,
      themeQ: query.themeQ,
      nameQ: query.nameQ,
    },
    context,
  )
  return favOnly ? filtered.filter((stock) => isFavorite(stock.ticker)) : filtered
}

export function stockPageCount(total: number): number {
  return Math.max(1, Math.ceil(total / STOCK_PAGE_SIZE))
}

export function pageRowsOf<T>(rows: readonly T[], page: number): T[] {
  return rows.slice((page - 1) * STOCK_PAGE_SIZE, page * STOCK_PAGE_SIZE)
}

export function pageOfCode(rows: readonly StockRowRes[], code: string | null): number | null {
  if (code === null) return null
  const index = rows.findIndex((stock) => stock.ticker === code)
  return index < 0 ? null : Math.floor(index / STOCK_PAGE_SIZE) + 1
}

export function resolveStockPage(requested: number | null, entryPage: number | null, pageCount: number): number {
  return Math.min(requested ?? entryPage ?? 1, pageCount)
}

export function stockQueryFix(search: string, query: StockQuery, rows: readonly StockRowRes[]): StockQuery | null {
  const params = new URLSearchParams(search)
  const badCode = params.has('code') && query.code === null
  const badPage = params.has('page') && query.page === null
  const pageCount = stockPageCount(rows.length)
  const overflow = query.page !== null && query.page > pageCount
  if (!badCode && !badPage && !overflow) return null
  if (!overflow) return { ...query, code: badCode ? null : query.code }
  const code = query.code !== null && pageOfCode(rows, query.code) === pageCount ? query.code : null
  return { ...query, page: pageCount > 1 ? pageCount : null, code }
}

export type PageItem = number | 'gap'

export function pageItems(page: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  let start = page - 1
  let end = page + 1
  if (page <= 2) {
    start = 1
    end = 3
  } else if (page >= total - 1) {
    start = total - 2
    end = total
  }
  const items: PageItem[] = []
  if (start > 1) items.push(1)
  if (start === 3) items.push(2)
  else if (start > 3) items.push('gap')
  for (let n = start; n <= end; n++) items.push(n)
  if (end === total - 2) items.push(total - 1)
  else if (end < total - 2) items.push('gap')
  if (end < total) items.push(total)
  return items
}

export function columnSort(sort: StockSort, column: StockColumn): AriaSort | undefined {
  if (column === 'change') {
    if (sort === 'rise') return 'descending'
    if (sort === 'fall') return 'ascending'
    return undefined
  }
  return sort === column ? 'descending' : undefined
}

export function nextColumnSort(sort: StockSort, column: StockColumn): StockSort {
  if (column === 'change') return sort === 'rise' ? 'fall' : 'rise'
  return column
}

const SCOPE: Record<StockMarket, { title: string; caption: string }> = {
  ALL: { title: '전체 종목', caption: '코스피·코스닥' },
  KOSPI: { title: '코스피 종목', caption: '코스피' },
  KOSDAQ: { title: '코스닥 종목', caption: '코스닥' },
}

export function scopeTitle(market: StockMarket, favOnly: boolean): string {
  return favOnly ? '관심 종목' : SCOPE[market].title
}

export function scopeCaption(market: StockMarket, favOnly: boolean, count: number): string {
  const n = count.toLocaleString('ko-KR')
  return favOnly ? `관심 종목 ${n}개` : `${SCOPE[market].caption} ${n}종목`
}

export interface StockSelection {
  rows: readonly StockRowRes[]
  selected: StockRowRes | null
  missing: boolean
}

export function stockSelection(
  pageRows: readonly StockRowRes[],
  filtered: readonly StockRowRes[],
  all: readonly StockRowRes[],
  code: string | null,
): StockSelection {
  if (code === null) return { rows: pageRows, selected: pageRows[0] ?? null, missing: false }
  const onPage = pageRows.find((stock) => stock.ticker === code)
  if (onPage) return { rows: pageRows, selected: onPage, missing: false }
  const listed = filtered.find((stock) => stock.ticker === code)
  if (listed) return { rows: [...pageRows, listed], selected: listed, missing: false }
  const known = all.find((stock) => stock.ticker === code)
  if (known) return { rows: pageRows, selected: known, missing: false }
  return { rows: pageRows, selected: null, missing: true }
}

export function keepCode(code: string | null, rows: readonly StockRowRes[]): string | null {
  return code !== null && rows.some((stock) => stock.ticker === code) ? code : null
}

export interface ThemeFilter {
  themeId: number | null
  themeQ: string | null
}

export function themeTickerSet(
  themeId: number | null,
  members: readonly Pick<ThemeStockRes, 'ticker'>[] | null,
  match: Pick<ThemeTickersRes, 'tickers'> | null,
): ReadonlySet<string> | null {
  if (themeId !== null) return members ? new Set(members.map((stock) => stock.ticker)) : null
  return match ? new Set(match.tickers) : null
}

export function themeChipLabel(themeQ: string | null, themeName: string | null): string {
  return themeQ !== null ? `테마 ‘${themeQ}’ 포함` : `테마 ${themeName ?? ''}`
}
