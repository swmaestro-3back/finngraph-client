import { sourceUrl } from '@/lib/apiMappers'
import type { NewsDetail } from '@/lib/apiTypes'
import { addDays, isWeekend } from '@/lib/calendar'
import { pressName } from '@/lib/format'
import { dayLabel, minusMonths, monthDayLabel } from '@/lib/fg/themeCharts'

export interface ThemeNewsItem {
  id: string
  title: string
  url: string
  press: string
  day: string
  time: string
  tradeDay: string
  analyzed: boolean
}

const KST = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function kstDayTime(iso: string): { day: string; time: string } | null {
  if (!iso) return null
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return null
  const parts = KST.formatToParts(at)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  return { day: `${part('year')}-${part('month')}-${part('day')}`, time: `${part('hour')}:${part('minute')}` }
}

function nextWeekday(day: string): string {
  let next = day
  while (isWeekend(next)) next = addDays(next, 1)
  return next
}

export function tradeDayOf(day: string, tradingDays: readonly string[]): string {
  const last = tradingDays.length - 1
  if (last < 0 || day < tradingDays[0] || day > tradingDays[last]) return nextWeekday(day)
  let lo = 0
  let hi = last
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (tradingDays[mid] < day) lo = mid + 1
    else hi = mid
  }
  return tradingDays[lo]
}

export function toThemeNews(news: readonly NewsDetail[], tradingDays: readonly string[]): ThemeNewsItem[] {
  return news
    .flatMap((n) => {
      const at = kstDayTime(n.collectedAt)
      if (!at) return []
      const url = sourceUrl(n)
      return [
        {
          id: n.id,
          title: n.title,
          url,
          press: pressName(url),
          day: at.day,
          time: at.time,
          tradeDay: tradeDayOf(at.day, tradingDays),
          analyzed: n.tripleExtracted === true,
        },
      ]
    })
    .sort((a, b) => `${b.day} ${b.time}`.localeCompare(`${a.day} ${a.time}`))
}

export type NewsRange = 'w' | 'm' | 'all'

export const NEWS_RANGES: readonly { value: NewsRange; label: string }[] = [
  { value: 'w', label: '최근 1주' },
  { value: 'm', label: '최근 1달' },
  { value: 'all', label: '전체' },
]

const RANGE_LABEL: Record<NewsRange, string> = { w: '최근 1주', m: '최근 1달', all: '전체' }

export const NEWS_PAGE_SIZE = 8
const DEFAULT_RANGE_MIN = 5
const OPEN_DAYS = 7

export function rangeStart(range: NewsRange, today: string): string {
  if (range === 'w') return addDays(today, -(OPEN_DAYS - 1))
  if (range === 'm') return minusMonths(today, 1)
  return ''
}

export function guestStart(today: string): string {
  return addDays(today, -(OPEN_DAYS - 1))
}

export function defaultRange(items: readonly ThemeNewsItem[], today: string): NewsRange {
  const ranges: NewsRange[] = ['w', 'm', 'all']
  const count = (range: NewsRange) => items.filter((n) => n.day >= rangeStart(range, today)).length
  return (
    ranges.find((range) => count(range) >= DEFAULT_RANGE_MIN) ??
    ranges.find((range) => items.length > 0 && count(range) === items.length) ??
    'all'
  )
}

export interface MarkerSlot {
  at: number
  members: number[]
  left: number
  right: number
}

export function clusterSlots(
  indices: readonly number[],
  xOf: (index: number) => number,
  mergeBelow = 12,
  maxHit = 40,
): MarkerSlot[] {
  const half = maxHit / 2
  const sorted = [...new Set(indices)].sort((a, b) => b - a)
  const slots: MarkerSlot[] = []
  for (const index of sorted) {
    const current = slots[slots.length - 1]
    if (current && xOf(current.at) - xOf(index) < mergeBelow) current.members.push(index)
    else slots.push({ at: index, members: [index], left: half, right: half })
  }
  slots.forEach((slot, k) => {
    const newer = k > 0 ? xOf(slots[k - 1].at) - xOf(slot.at) : Infinity
    const older = k < slots.length - 1 ? xOf(slot.at) - xOf(slots[k + 1].at) : Infinity
    slot.left = Math.min(half, older / 2)
    slot.right = Math.min(half, newer / 2)
  })
  return slots
}

export function nearestSlot<T extends { at: number }>(
  slots: readonly T[],
  x: number,
  xOf: (index: number) => number,
  maxDistance = 24,
): T | null {
  let best: T | null = null
  let bestDistance = Infinity
  for (const slot of slots) {
    const distance = Math.abs(xOf(slot.at) - x)
    if (distance <= maxDistance && distance < bestDistance) {
      best = slot
      bestDistance = distance
    }
  }
  return best
}

export interface NewsMarker {
  id: string
  at: number
  left: number
  right: number
  label: string
  items: ThemeNewsItem[]
  locked: boolean
  aria: string
}

export function newsMarkers(
  items: readonly ThemeNewsItem[],
  windowDates: readonly string[],
  xOf: (index: number) => number,
  openFrom: string | null,
  refYear: number,
): NewsMarker[] {
  const indexOf = new Map(windowDates.map((date, i) => [date, i]))
  const indices = items.flatMap((n) => {
    const index = indexOf.get(n.tradeDay)
    return index === undefined ? [] : [index]
  })
  return clusterSlots(indices, xOf).map((slot) => {
    const days = new Set(slot.members.map((i) => windowDates[i]))
    const lo = windowDates[Math.min(...slot.members)]
    const hi = windowDates[Math.max(...slot.members)]
    const label = lo === hi ? monthDayLabel(hi, refYear) : `${monthDayLabel(lo, refYear)} ~ ${monthDayLabel(hi, refYear)}`
    const markerItems = items.filter((n) => days.has(n.tradeDay))
    const open = openFrom === null ? markerItems.length : markerItems.filter((n) => n.day >= openFrom).length
    const locked = open === 0
    return {
      id: lo === hi ? hi : `${lo}~${hi}`,
      at: slot.at,
      left: slot.left,
      right: slot.right,
      label,
      items: markerItems,
      locked,
      aria: locked ? `${label} 뉴스, 로그인하면 볼 수 있어요` : `${label} 뉴스 ${open}건`,
    }
  })
}

export interface NewsRow {
  item: ThemeNewsItem
  meta: string
}

export interface NewsGroup {
  tradeDay: string
  label: string
  total: number
  rows: NewsRow[]
}

export interface NewsListInput {
  items: readonly ThemeNewsItem[]
  selected: NewsMarker | null
  range: NewsRange
  onlyAnalyzed: boolean
  page: number
  openFrom: string | null
  today: string
}

export interface NewsListView {
  scope: string
  open: ThemeNewsItem[]
  analyzedCount: number
  countText: string
  groups: NewsGroup[]
  more: number
  empty: 'none' | 'no-match' | null
  gated: boolean
}

export function newsListView({ items, selected, range, onlyAnalyzed, page, openFrom, today }: NewsListInput): NewsListView {
  const refYear = Number(today.slice(0, 4))
  const visible = (n: ThemeNewsItem) => openFrom === null || n.day >= openFrom
  const start = rangeStart(range, today)
  const base = selected ? selected.items : items.filter((n) => n.day >= start)
  const filtered = onlyAnalyzed ? base.filter((n) => n.analyzed) : base
  const open = filtered.filter(visible)
  const listed = open.slice(0, NEWS_PAGE_SIZE * page)
  const groups: NewsGroup[] = []
  for (const n of listed) {
    let group = groups[groups.length - 1]
    if (!group || group.tradeDay !== n.tradeDay) {
      group = {
        tradeDay: n.tradeDay,
        label: dayLabel(n.tradeDay, refYear),
        total: open.filter((o) => o.tradeDay === n.tradeDay).length,
        rows: [],
      }
      groups.push(group)
    }
    const when = n.day === n.tradeDay ? n.time : `${dayLabel(n.day, refYear)} ${n.time}`
    group.rows.push({ item: n, meta: `${n.press} · ${when}` })
  }
  const scope = selected ? selected.label : RANGE_LABEL[range]
  const gatedOut = openFrom !== null && filtered.length > 0
  let empty: NewsListView['empty'] = null
  if (items.length === 0) empty = 'none'
  else if (open.length === 0 && !gatedOut) empty = 'no-match'
  return {
    scope,
    open,
    analyzedCount: base.filter((n) => n.analyzed && visible(n)).length,
    countText: `${scope} ${open.length}건 · 분석 ${open.filter((n) => n.analyzed).length}건 · 최신순`,
    groups,
    more: Math.min(NEWS_PAGE_SIZE, open.length - listed.length),
    empty,
    gated: openFrom !== null && items.some((n) => !visible(n)),
  }
}
