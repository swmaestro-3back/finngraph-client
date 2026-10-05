import type { ThemeLeaderRes, ThemeMarketRes, ThemeRes, ThemeStockRes } from '@/lib/apiTypes'
import { formatChange } from '@/lib/format'
import { priceBasisSuffix, QUOTE_SOURCE_LABEL } from '@/lib/referenceDate'
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

export type ThemeIssueView =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; issue: ThemeIssueRef | null; date: string | null }

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
export type TileTextGrade = Exclude<TileGrade, 'xs'>

export interface TileFont {
  weight: number
  size: number
  line: number
  tabular?: boolean
}

export interface TileType {
  name: TileFont
  sub: TileFont
  change: TileFont
  detail: TileFont
}

export const TILE_TYPE: Record<TileTextGrade, TileType> = {
  s: {
    name: { weight: 700, size: 11, line: 13 },
    sub: { weight: 500, size: 11, line: 13 },
    change: { weight: 600, size: 11, line: 13, tabular: true },
    detail: { weight: 500, size: 11, line: 13, tabular: true },
  },
  m: {
    name: { weight: 700, size: 13, line: 17 },
    sub: { weight: 500, size: 11, line: 14 },
    change: { weight: 600, size: 12, line: 16, tabular: true },
    detail: { weight: 500, size: 11, line: 14, tabular: true },
  },
  l: {
    name: { weight: 700, size: 15, line: 20 },
    sub: { weight: 500, size: 12, line: 16 },
    change: { weight: 600, size: 12, line: 16, tabular: true },
    detail: { weight: 500, size: 11, line: 14, tabular: true },
  },
  xl: {
    name: { weight: 700, size: 17, line: 22 },
    sub: { weight: 500, size: 14, line: 18 },
    change: { weight: 600, size: 13, line: 17, tabular: true },
    detail: { weight: 500, size: 12, line: 16, tabular: true },
  },
}

const SPACE_1 = 4
const SPACE_2 = 8
const SPACE_3 = 12
const TILE_BORDER = 1
const TILE_GAP = 2
const TILE_PAD_Y = SPACE_1
const TILE_PAD_X: Record<TileTextGrade, number> = { s: SPACE_1, m: SPACE_2, l: SPACE_3, xl: SPACE_3 }
const TILE_INLINE_GAP = SPACE_2
const SMALLER: Record<TileTextGrade, TileTextGrade> = { s: 's', m: 's', l: 'm', xl: 'l' }

function contentHeight(height: number): number {
  return height - 2 * TILE_BORDER - 2 * TILE_PAD_Y
}

function contentWidth(width: number, grade: TileTextGrade): number {
  return width - 2 * TILE_BORDER - 2 * TILE_PAD_X[grade]
}

function stackHeight(lines: readonly number[]): number {
  return lines.reduce((sum, line) => sum + line, 0) + TILE_GAP * Math.max(0, lines.length - 1)
}

export function tileGrade(width: number, height: number): TileGrade {
  if (width < 56 || height < 36) return 'xs'
  let grade: TileTextGrade = width < 72 || height < 40 ? 's' : width < 130 ? 'm' : width < 200 ? 'l' : 'xl'
  while (grade !== 's' && stackHeight([TILE_TYPE[grade].name.line, TILE_TYPE[grade].change.line]) > contentHeight(height)) {
    grade = SMALLER[grade]
  }
  return grade
}

export type MeasureText = (text: string, font: TileFont) => number

export interface TileParts {
  name: string
  change: string
  detail: string | null
}

export type TileNameFit = 'full' | 'word' | 'char'

export interface TileText {
  grade: TileTextGrade
  name: string
  nameLines: 1 | 2
  nameFit: TileNameFit
  sub: string | null
  change: boolean
  detail: 'line' | 'inline' | null
}

function splitParen(name: string): [string, string | null] {
  const i = name.indexOf('(')
  if (i <= 0) return [name, null]
  return [name.slice(0, i).trim(), name.slice(i).trim()]
}

function wrapLines(text: string, font: TileFont, width: number, measure: MeasureText): number {
  let lines = 0
  let line = ''
  for (const word of text.split(' ').filter(Boolean)) {
    if (measure(word, font) > width) return Infinity
    const next = line ? `${line} ${word}` : word
    if (line && measure(next, font) > width) {
      lines += 1
      line = word
    } else {
      line = next
    }
  }
  return line ? lines + 1 : lines
}

function wordCut(text: string, font: TileFont, width: number, measure: MeasureText): string | null {
  const words = text.split(' ').filter(Boolean)
  for (let k = words.length - 1; k >= 1; k -= 1) {
    const cut = `${words.slice(0, k).join(' ')}…`
    if (measure(cut, font) <= width) return cut
  }
  return null
}

export function tileText(width: number, height: number, parts: TileParts, measure: MeasureText): TileText | null {
  const level = tileGrade(width, height)
  if (level === 'xs') return null
  const first = planAt(level, width, height, parts, measure)
  if (first.nameFit === 'full') return first
  for (let grade = level; grade !== 's'; ) {
    grade = SMALLER[grade]
    const next = planAt(grade, width, height, parts, measure)
    if (next.nameFit === 'full' && (next.change || !first.change)) return next
  }
  return first
}

function planAt(
  grade: TileTextGrade,
  width: number,
  height: number,
  parts: TileParts,
  measure: MeasureText,
): TileText {
  const type = TILE_TYPE[grade]
  const w = contentWidth(width, grade)
  const h = contentHeight(height)
  const fits = (lines: readonly number[]) => stackHeight(lines) <= h
  const [main, sub] = splitParen(parts.name)
  const mainLines = wrapLines(main, type.name, w, measure)
  const nameLine = type.name.line
  const changeLine = type.change.line
  const changeWidth = measure(parts.change, type.change)
  const changeFits = changeWidth <= w
  const base = { grade, sub: null, detail: null } as const

  if (mainLines <= 2) {
    const nameLines = mainLines as 1 | 2
    const nameHeight = nameLines * nameLine
    const full = { ...base, name: main, nameLines, nameFit: 'full' as const }
    if (changeFits) {
      const shownSub = sub !== null && measure(sub, type.sub) <= w ? sub : null
      const head = shownSub === null ? [nameHeight] : [nameHeight, type.sub.line]
      const detail = parts.detail
      if (detail) {
        if (measure(detail, type.detail) <= w && fits([...head, changeLine, type.detail.line])) {
          return { ...full, sub: shownSub, change: true, detail: 'line' }
        }
        if (changeWidth + TILE_INLINE_GAP + measure(detail, type.detail) <= w && fits([...head, changeLine])) {
          return { ...full, sub: shownSub, change: true, detail: 'inline' }
        }
      }
      if (fits([...head, changeLine])) return { ...full, sub: shownSub, change: true }
      if (fits([nameHeight, changeLine])) return { ...full, change: true }
    }
  }

  const cut = wordCut(main, type.name, w, measure)
  const oneLine = (name: string, nameFit: TileNameFit, change: boolean): TileText => ({
    ...base,
    name,
    nameLines: 1,
    nameFit,
    change,
  })
  if (changeFits && cut && fits([nameLine, changeLine])) return oneLine(cut, 'word', true)
  if (mainLines <= 2 && fits([mainLines * nameLine])) {
    return { ...base, name: main, nameLines: mainLines as 1 | 2, nameFit: 'full', change: false }
  }
  if (cut && fits([nameLine])) return oneLine(cut, 'word', false)
  return oneLine(main, 'char', changeFits && fits([nameLine, changeLine]))
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
  return `${month}월 ${day}일(${weekday}) ${priceBasisSuffix(market)} · ${QUOTE_SOURCE_LABEL}`
}

export const TILE_REFLOW_MS = 500
export const TILE_ENTER_MS = 400
export const TILE_REFLOW_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const TILE_STAGGER_MS = 22
const TILE_STAGGER_MAX_MS = 400
export const TILE_REFLOW_HOLD_MS = Math.max(TILE_REFLOW_MS, TILE_STAGGER_MAX_MS + TILE_ENTER_MS) + 100

export function tileEnterDelay(index: number): number {
  return Math.min(index * TILE_STAGGER_MS, TILE_STAGGER_MAX_MS)
}

export function enteringIds(prev: readonly { id: number }[], next: readonly { id: number }[]): Set<number> {
  const before = new Set(prev.map((tile) => tile.id))
  return new Set(next.filter((tile) => !before.has(tile.id)).map((tile) => tile.id))
}
