import type { ThemeLeaderRes, ThemeMarketRes, ThemeRes, ThemeStockRes } from '@/lib/apiTypes'
import { formatChange } from '@/lib/format'
import { priceBasisSuffix } from '@/lib/referenceDate'
import { compareNullLast, tileDetail } from '@/lib/themeMetrics'
import { normalizeSizes, tileSize } from '@/lib/treemapColor'

export type ThemeView = 'map' | 'table'
export type ThemeSort = 'change' | 'value'

export const THEME_MAP_COUNTS = [10, 20, 30] as const
export type ThemeMapCount = (typeof THEME_MAP_COUNTS)[number]
export const DEFAULT_MAP_COUNT: ThemeMapCount = 20
export const THEME_ROW_LIMIT = 10
export const MEMBER_LIMIT = 10

export type ChangeOf = (theme: ThemeRes) => number | null

export const weightedChangeOf: ChangeOf = (theme) => theme.weightedChange ?? null

export interface ThemeIssueRef {
  id: number
  title: string
  mediaCount: number
}

export type IssueOf = (theme: ThemeRes) => ThemeIssueRef | null

export interface ThemeQuery {
  view: ThemeView | null
  sort: ThemeSort | null
  count: ThemeMapCount
  fav: boolean
  id: number | null
}

export function toMapCount(value: string | null): ThemeMapCount {
  const count = Number(value)
  return THEME_MAP_COUNTS.find((option) => option === count) ?? DEFAULT_MAP_COUNT
}

export function parseThemeQuery(search: string): ThemeQuery {
  const params = new URLSearchParams(search)
  const view = params.get('view')
  const sort = params.get('sort')
  return {
    view: view === 'map' || view === 'table' ? view : null,
    sort: sort === 'change' || sort === 'value' ? sort : null,
    count: toMapCount(params.get('count')),
    fav: params.get('fav') === '1',
    id: parseThemeId(params.get('id')),
  }
}

export function themeQueryString(query: ThemeQuery): string {
  const params = new URLSearchParams()
  if (query.view) params.set('view', query.view)
  if (query.sort) params.set('sort', query.sort)
  if (query.count !== DEFAULT_MAP_COUNT) params.set('count', String(query.count))
  if (query.fav) params.set('fav', '1')
  if (query.id !== null) params.set('id', String(query.id))
  const text = params.toString()
  return text ? `?${text}` : ''
}

export function parseThemeId(raw: string | null | undefined): number | null {
  if (!raw || !/^[1-9]\d*$/.test(raw)) return null
  const id = Number(raw)
  return Number.isSafeInteger(id) ? id : null
}

export function resolveView(requested: ThemeView | null, narrow: boolean): ThemeView {
  return requested ?? (narrow ? 'table' : 'map')
}

export function resolveSort(requested: ThemeSort | null): ThemeSort {
  return requested ?? 'change'
}

export function sortThemes(themes: readonly ThemeRes[], sort: ThemeSort, changeOf: ChangeOf): ThemeRes[] {
  const key = (theme: ThemeRes): number | null => (sort === 'change' ? changeOf(theme) : theme.tradingValue)
  return [...themes].sort(
    (a, b) => compareNullLast(key(a), key(b), true) || a.name.localeCompare(b.name, 'ko'),
  )
}

export function visibleThemes(sorted: readonly ThemeRes[], showAll: boolean, selectedId: number | null): ThemeRes[] {
  if (showAll) return [...sorted]
  return sorted.filter((theme, index) => index < THEME_ROW_LIMIT || theme.id === selectedId)
}

export function largestMove(themes: readonly ThemeRes[], changeOf: ChangeOf): ThemeRes | null {
  let best: ThemeRes | null = null
  let bestSize = -1
  for (const theme of themes) {
    const change = changeOf(theme)
    if (change === null || Math.abs(change) <= bestSize) continue
    best = theme
    bestSize = Math.abs(change)
  }
  return best
}

export function defaultThemeId(
  view: ThemeView,
  sorted: readonly ThemeRes[],
  mapThemes: readonly ThemeRes[],
  changeOf: ChangeOf,
): number | null {
  if (view === 'map') {
    const move = largestMove(mapThemes, changeOf)
    if (move) return move.id
  }
  return sorted[0]?.id ?? null
}

export interface HeldDefault {
  view: ThemeView
  sort: ThemeSort
  id: number
}

export function stableDefaultId(
  held: HeldDefault | null,
  view: ThemeView,
  sort: ThemeSort,
  sorted: readonly ThemeRes[],
  mapThemes: readonly ThemeRes[],
  changeOf: ChangeOf,
): number | null {
  const candidates = view === 'map' && mapThemes.length > 0 ? mapThemes : sorted
  const sameKey = held !== null && held.view === view && held.sort === sort
  if (sameKey && candidates.some((theme) => theme.id === held.id)) return held.id
  return defaultThemeId(view, sorted, mapThemes, changeOf)
}

export interface ThemeLead {
  total: number
  ups: number
  best: { name: string; change: number } | null
}

export function themeLead(themes: readonly ThemeRes[], changeOf: ChangeOf): ThemeLead | null {
  let total = 0
  let ups = 0
  let best: ThemeLead['best'] = null
  for (const theme of themes) {
    const change = changeOf(theme)
    if (change === null) continue
    total += 1
    if (change <= 0) continue
    ups += 1
    if (best === null || change > best.change) best = { name: theme.name, change }
  }
  return total === 0 ? null : { total, ups, best }
}

export function themeLeader(theme: Pick<ThemeRes, 'leaders'>): ThemeLeaderRes | null {
  return theme.leaders?.find((leader) => leader.change !== null) ?? null
}

export interface MemberRow {
  ticker: string
  name: string
  price: number | null
  change: number | null
  leader: boolean
}

export function memberRows(stocks: readonly ThemeStockRes[], leaderTicker: string | null): MemberRow[] {
  const rows = [...stocks]
    .sort((a, b) => compareNullLast(a.change, b.change, true) || a.name.localeCompare(b.name, 'ko'))
    .map((stock) => ({
      ticker: stock.ticker,
      name: stock.name,
      price: stock.price,
      change: stock.change,
      leader: stock.ticker === leaderTicker,
    }))
  const lead = rows.findIndex((row) => row.leader)
  if (lead > 0) rows.unshift(...rows.splice(lead, 1))
  return rows
}

export type TileGrade = 'xs' | 's' | 'm' | 'l' | 'xl'

export function tileGrade(width: number, height: number): TileGrade {
  if (width < 56 || height < 36) return 'xs'
  if (height < 56) return 's'
  if (width < 120 || height < 88) return 'm'
  if (width >= 220 && height >= 150) return 'xl'
  return 'l'
}

export function tileAria(theme: Pick<ThemeRes, 'name' | 'upCount' | 'downCount'>, change: number): string {
  const head = `${theme.name} ${formatChange(change)}`
  if (theme.upCount === undefined || theme.downCount === undefined) return head
  return `${head}, 상승 ${theme.upCount}종목 하락 ${theme.downCount}종목`
}

export interface ThemeTileModel {
  id: number
  name: string
  change: number
  size: number
  detail: string | null
  label: string
}

export function themeTiles(themes: readonly ThemeRes[], changeOf: ChangeOf): ThemeTileModel[] {
  const priced = themes.flatMap((theme) => {
    const change = changeOf(theme)
    return change === null ? [] : [{ theme, change }]
  })
  const sizes = normalizeSizes(priced.map(({ change }) => tileSize(change)))
  return priced.map(({ theme, change }, index) => ({
    id: theme.id,
    name: theme.name,
    change,
    size: sizes[index],
    detail: tileDetail(theme),
    label: tileAria(theme, change),
  }))
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

export function themeBasisLabel(
  market: Pick<ThemeMarketRes, 'baseDate' | 'valuationDate' | 'updatedAt'> | null,
): string | null {
  const [year, month, day] = (market?.baseDate ?? '').split('-').map(Number)
  if (!year || !month || !day) return null
  const weekday = WEEKDAYS[new Date(year, month - 1, day).getDay()]
  return `${month}월 ${day}일(${weekday}) ${priceBasisSuffix(market)}`
}
