import type { CalendarEventRes, FavoriteItemRes, FolderReturnPeriod, StockIssueRes, StockRowRes } from '@/lib/apiTypes'
import { addDays, kstToday } from '@/lib/calendar'
import { isFirstHop } from '@/lib/fg/linkedCompanies'
import type { LinkedCompany } from '@/lib/fg/stockLinks'
import { dateTicks, type DateTick } from '@/lib/fg/themeCharts'
import { gapFromHigh } from '@/lib/fg/week52'

export type SmartKey = 'issue' | 'event' | 'high' | 'drop'

export const SMART_KEYS: readonly SmartKey[] = ['issue', 'event', 'high', 'drop']

export const SMART_LABEL: Record<SmartKey, string> = {
  issue: '오늘 이슈 난 종목',
  event: '일주일 안에 일정',
  high: '52주 신고가 5% 안',
  drop: '오늘 3% 넘게 하락',
}

export const SMART_TONE: Record<SmartKey, 'event' | 'neutral' | 'up' | 'down'> = {
  issue: 'event',
  event: 'neutral',
  high: 'up',
  drop: 'down',
}

export const SMART_HINT: Record<SmartKey, string> = {
  issue: '오늘 기사로 묶인 이슈가 생긴 관심 종목이에요',
  event: '7일 안에 배당·증자·주총 일정이 있는 관심 종목이에요',
  high: '52주 신고가와 5% 안쪽으로 가까운 관심 종목이에요',
  drop: '오늘 3% 넘게 내린 관심 종목이에요',
}

const NEAR_HIGH_PCT = -5
const DROP_PCT = -3
const EVENT_DAYS = 7
const INNER_LINK_TYPES = new Set(['supply', 'customer', 'invest', 'acquire'])

export type ItemSort = 'change' | 'recent' | 'name'

export const ITEM_SORTS: readonly { value: ItemSort; label: string }[] = [
  { value: 'change', label: '오늘 등락률' },
  { value: 'recent', label: '등록순' },
  { value: 'name', label: '이름순' },
]

export interface FavoriteSignals {
  issues: ReadonlyMap<string, StockIssueRes | null> | null
  events: readonly CalendarEventRes[] | null
  quotes: ReadonlyMap<string, StockRowRes> | null
  today: string
}

export interface StockSignal {
  issue: StockIssueRes | null
  event: CalendarEventRes | null
  gap: number | null
}

export interface MoveCount {
  up: number
  down: number
  flat: number
  total: number
}

export interface InnerLink {
  key: string
  company: LinkedCompany
  from: string
}

export interface FitCompany {
  from: string
  company: LinkedCompany
}

export function eventWindow(today: string): { from: string; to: string } {
  return { from: today, to: addDays(today, EVENT_DAYS) }
}

function issuedOn(issue: StockIssueRes | null | undefined, today: string): StockIssueRes | null {
  if (!issue?.lastPublishedAt) return null
  const at = new Date(issue.lastPublishedAt)
  if (Number.isNaN(at.getTime())) return null
  return kstToday(at) === today ? issue : null
}

function nextEvent(ticker: string, events: readonly CalendarEventRes[] | null, today: string): CalendarEventRes | null {
  if (!events) return null
  const until = addDays(today, EVENT_DAYS)
  let best: CalendarEventRes | null = null
  for (const event of events) {
    if (event.ticker !== ticker || event.date < today || event.date > until) continue
    if (!best || event.date < best.date) best = event
  }
  return best
}

export function signalOf(ticker: string, signals: FavoriteSignals): StockSignal {
  const row = signals.quotes?.get(ticker) ?? null
  const gap = row && row.price !== null && row.high52w ? gapFromHigh(row.price, row.high52w) : null
  return {
    issue: issuedOn(signals.issues?.get(ticker), signals.today),
    event: nextEvent(ticker, signals.events, signals.today),
    gap,
  }
}

export function smartMatches(item: FavoriteItemRes, key: SmartKey, signal: StockSignal | null): boolean {
  if (item.type !== 'STOCK' || !item.stock) return false
  switch (key) {
    case 'issue':
      return signal?.issue != null
    case 'event':
      return signal?.event != null
    case 'high':
      return signal?.gap != null && signal.gap >= NEAR_HIGH_PCT
    case 'drop':
      return item.stock.change !== null && item.stock.change < DROP_PCT
  }
}

function stockChanges(items: readonly FavoriteItemRes[]): number[] {
  return items.flatMap((item) => (item.type === 'STOCK' && item.stock?.change != null ? [item.stock.change] : []))
}

export function moveCount(items: readonly FavoriteItemRes[]): MoveCount {
  const changes = stockChanges(items)
  return {
    up: changes.filter((value) => value > 0).length,
    down: changes.filter((value) => value < 0).length,
    flat: changes.filter((value) => value === 0).length,
    total: changes.length,
  }
}

export function averageChange(items: readonly FavoriteItemRes[]): number | null {
  const changes = stockChanges(items)
  if (changes.length === 0) return null
  return Math.round((changes.reduce((sum, value) => sum + value, 0) / changes.length) * 100) / 100
}

export function itemName(item: FavoriteItemRes): string {
  return item.stock?.name ?? item.theme?.name ?? item.key
}

function itemChange(item: FavoriteItemRes): number | null {
  return item.stock?.change ?? item.theme?.weightedChange ?? null
}

export function sortItems(items: readonly FavoriteItemRes[], sort: ItemSort): FavoriteItemRes[] {
  const list = [...items]
  if (sort === 'name') return list.sort((a, b) => itemName(a).localeCompare(itemName(b), 'ko'))
  if (sort === 'recent') return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return list.sort((a, b) => {
    const left = itemChange(a)
    const right = itemChange(b)
    if (left === null && right === null) return 0
    if (left === null) return 1
    if (right === null) return -1
    return right - left
  })
}

export function memberStocks(items: readonly FavoriteItemRes[]): { name: string; ticker: string }[] {
  return items.flatMap((item) =>
    item.type === 'STOCK' && item.stock ? [{ name: item.stock.name, ticker: item.stock.ticker }] : [],
  )
}

export function innerLinks(
  members: readonly { name: string; ticker: string }[],
  lists: ReadonlyMap<string, readonly LinkedCompany[]>,
): InnerLink[] {
  const tickers = new Set(members.map((member) => member.ticker))
  const picked = new Map<string, InnerLink>()
  for (const member of members) {
    for (const company of lists.get(member.ticker) ?? []) {
      if (!isFirstHop(company) || company.code === null || company.code === member.ticker) continue
      if (!tickers.has(company.code) || !INNER_LINK_TYPES.has(company.type)) continue
      const key = [member.ticker, company.code].sort().join('-')
      if (!picked.has(key)) picked.set(key, { key, company, from: member.name })
    }
  }
  return [...picked.values()]
}

export interface LinkArrow {
  from: string
  to: string
  label: string
}

export function linkArrow(link: InnerLink): LinkArrow | null {
  const { company } = link
  if (company.type === 'supply') return { from: company.name, to: link.from, label: company.tag }
  if (company.type === 'customer') return { from: link.from, to: company.name, label: company.tag.replace(/구매$/, '공급') }
  return null
}

export function folderEvent(
  members: readonly FavoriteItemRes[],
  signals: ReadonlyMap<string, StockSignal>,
): CalendarEventRes | null {
  let best: CalendarEventRes | null = null
  for (const member of members) {
    if (member.type !== 'STOCK') continue
    const event = signals.get(member.key)?.event ?? null
    if (event && (!best || event.date < best.date)) best = event
  }
  return best
}

export function fitCompanies(links: readonly FitCompany[], limit: number): FitCompany[] {
  return links
    .filter((link) => isFirstHop(link.company) && link.company.code !== null && INNER_LINK_TYPES.has(link.company.type))
    .slice(0, limit)
}

export interface ReturnPath {
  line: string
  zero: number
}

export const MOVER_EDGE = 3
const DAY_TICK_LIMIT = 6

export function moverSet<T>(stocks: readonly T[]): { top: T[]; bottom: T[]; hidden: number } {
  if (stocks.length <= MOVER_EDGE * 2) return { top: [...stocks], bottom: [], hidden: 0 }
  return {
    top: stocks.slice(0, MOVER_EDGE),
    bottom: stocks.slice(-MOVER_EDGE),
    hidden: stocks.length - MOVER_EDGE * 2,
  }
}

function shortDay(date: string): string {
  return `${Number(date.slice(5, 7))}.${Number(date.slice(8, 10))}`
}

export function returnTicks(dates: readonly string[], period: FolderReturnPeriod): DateTick[] {
  if (period === '3M') return dateTicks(dates, 'months')
  if (dates.length === 0) return []
  const last = dates.length - 1
  const indexes =
    dates.length <= DAY_TICK_LIMIT
      ? dates.map((_, index) => index)
      : [...new Set([0, 1, 2, 3].map((step) => Math.round((step * last) / 3)))]
  return indexes.map((index) => ({ index, label: shortDay(dates[index]) }))
}

export function returnPath(values: readonly number[], width: number, height: number, pad: number): ReturnPath | null {
  if (values.length === 0) return null
  const low = Math.min(0, ...values)
  const high = Math.max(0, ...values)
  const span = high - low || 1
  const y = (value: number) => pad + ((high - value) / span) * (height - pad * 2)
  const step = values.length > 1 ? width / (values.length - 1) : 0
  const points = values.map((value, index) => `${(values.length > 1 ? index * step : width / 2).toFixed(1)},${y(value).toFixed(1)}`)
  return { line: points.join(' '), zero: y(0) }
}

export type FavoriteView = { kind: 'all' } | { kind: 'folder'; id: number } | { kind: 'smart'; key: SmartKey }

export const ALL_VIEW: FavoriteView = { kind: 'all' }

export function viewParam(view: FavoriteView): string | null {
  if (view.kind === 'folder') return `f${view.id}`
  if (view.kind === 'smart') return view.key
  return null
}

export function parseView(raw: string | null, folderIds: readonly number[]): FavoriteView {
  if (raw && (SMART_KEYS as readonly string[]).includes(raw)) return { kind: 'smart', key: raw as SmartKey }
  const match = raw ? /^f(\d+)$/.exec(raw) : null
  if (match && folderIds.includes(Number(match[1]))) return { kind: 'folder', id: Number(match[1]) }
  return ALL_VIEW
}

export function viewSearch(view: FavoriteView): string {
  const param = viewParam(view)
  return param ? `?view=${param}` : ''
}

export function kindLabel(items: readonly FavoriteItemRes[]): string {
  const stocks = items.filter((item) => item.type === 'STOCK').length
  return stocks === 0 ? '비어 있어요' : `종목 ${stocks}`
}
