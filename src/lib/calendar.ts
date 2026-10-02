import type { CalendarEventKind, CalendarEventRes, IpoRes, IpoStatus } from '@/lib/apiTypes'
import { formatWon } from '@/lib/format'
import { formatShortDate } from '@/lib/themeMetrics'

export const CALENDAR_MAX_RANGE_DAYS = 62

export const CALENDAR_NOTICE =
  '일정은 한국투자증권 API로 받은 예탁원(KSD) 정보 기준이며 발행사 사정으로 바뀔 수 있습니다. 참고용이며 투자 결과에 대한 책임은 지지 않습니다.'

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const

export const KIND_ORDER: readonly CalendarEventKind[] = [
  'DIV_EX',
  'DIV_RECORD',
  'DIV_PAY',
  'BONUS_EX',
  'BONUS_LIST',
  'RIGHTS_EX',
  'RIGHTS_SUBSCRIBE',
  'RIGHTS_LIST',
  'AGM',
]

export const KIND_LABELS: Record<CalendarEventKind, string> = {
  DIV_EX: '배당락',
  DIV_RECORD: '배당 기준일',
  DIV_PAY: '배당 지급',
  BONUS_EX: '무상 권리락',
  BONUS_LIST: '무상 신주상장',
  RIGHTS_EX: '유상 권리락',
  RIGHTS_SUBSCRIBE: '유상 청약',
  RIGHTS_LIST: '유상 신주상장',
  AGM: '주총',
}

export const KIND_SHORT_LABELS: Record<CalendarEventKind, string> = {
  DIV_EX: '배당락',
  DIV_RECORD: '기준일',
  DIV_PAY: '지급',
  BONUS_EX: '권리락',
  BONUS_LIST: '신주상장',
  RIGHTS_EX: '권리락',
  RIGHTS_SUBSCRIBE: '청약',
  RIGHTS_LIST: '신주상장',
  AGM: '주총',
}

export type EventFamily = 'DIV' | 'BONUS' | 'RIGHTS' | 'AGM'

export const FAMILY_ORDER: readonly EventFamily[] = ['DIV', 'BONUS', 'RIGHTS', 'AGM']

export const FAMILY_LABELS: Record<EventFamily, string> = {
  DIV: '배당',
  BONUS: '무상증자',
  RIGHTS: '유상증자',
  AGM: '주총',
}

export function kindFamily(kind: CalendarEventKind): EventFamily {
  if (kind.startsWith('DIV_')) return 'DIV'
  if (kind.startsWith('BONUS_')) return 'BONUS'
  if (kind.startsWith('RIGHTS_')) return 'RIGHTS'
  return 'AGM'
}

export const IPO_STATUS_LABELS: Record<IpoStatus, string> = {
  UPCOMING: '청약 예정',
  SUBSCRIBING: '청약 중',
  LISTING_PENDING: '상장 예정',
  LISTED: '상장',
}

const IPO_GROUP_TITLES: Record<IpoStatus, string> = {
  SUBSCRIBING: '청약 중',
  UPCOMING: '청약 예정',
  LISTING_PENDING: '상장 예정',
  LISTED: '최근 상장',
}

const IPO_GROUP_ORDER: readonly IpoStatus[] = ['SUBSCRIBING', 'UPCOMING', 'LISTING_PENDING', 'LISTED']

export interface YearMonth {
  year: number
  month: number
}

export interface GridCell {
  date: string
  day: number
  weekday: number
  inMonth: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000
const GRID_CELLS = 42

const pad = (n: number) => String(n).padStart(2, '0')

function toUtcMs(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function fromUtcMs(ms: number): string {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

function weekdayOf(isoDate: string): number {
  return new Date(toUtcMs(isoDate)).getUTCDay()
}

export function addDays(isoDate: string, days: number): string {
  return fromUtcMs(toUtcMs(isoDate) + days * DAY_MS)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS)
}

const KST_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const KST_DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Seoul',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((p) => p.type === type)?.value ?? ''
}

export function kstToday(now: Date): string {
  const parts = KST_DATE.formatToParts(now)
  return `${part(parts, 'year')}-${part(parts, 'month')}-${part(parts, 'day')}`
}

export function formatAsOf(iso: string | null): string | null {
  if (!iso) return null
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return null
  const parts = KST_DATE_TIME.formatToParts(at)
  return `${part(parts, 'month')}/${part(parts, 'day')} ${part(parts, 'hour')}:${part(parts, 'minute')}`
}

export function monthOf(isoDate: string): YearMonth {
  const [year, month] = isoDate.split('-').map(Number)
  return { year, month }
}

export function parseMonthParam(raw: string | null): YearMonth | null {
  const match = raw?.match(/^(\d{4})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return { year, month }
}

export function parseDateParam(raw: string | null): string | null {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  return fromUtcMs(toUtcMs(raw)) === raw ? raw : null
}

export function formatMonthParam({ year, month }: YearMonth): string {
  return `${year}-${pad(month)}`
}

export function formatMonthTitle({ year, month }: YearMonth): string {
  return `${year}년 ${month}월`
}

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

export function monthGrid(ym: YearMonth): GridCell[] {
  const first = `${formatMonthParam(ym)}-01`
  const start = addDays(first, -weekdayOf(first))
  return Array.from({ length: GRID_CELLS }, (_, index) => {
    const date = addDays(start, index)
    const { year, month } = monthOf(date)
    return {
      date,
      day: Number(date.slice(8)),
      weekday: index % 7,
      inMonth: year === ym.year && month === ym.month,
    }
  })
}

function daysInMonth({ year, month }: YearMonth): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function shiftMonthKeepingDay(isoDate: string, delta: number): string {
  const target = shiftMonth(monthOf(isoDate), delta)
  const day = Math.min(Number(isoDate.slice(8)), daysInMonth(target))
  return `${formatMonthParam(target)}-${pad(day)}`
}

export function keyboardTarget(isoDate: string, key: string): string | null {
  switch (key) {
    case 'ArrowLeft':
      return addDays(isoDate, -1)
    case 'ArrowRight':
      return addDays(isoDate, 1)
    case 'ArrowUp':
      return addDays(isoDate, -7)
    case 'ArrowDown':
      return addDays(isoDate, 7)
    case 'Home':
      return addDays(isoDate, -weekdayOf(isoDate))
    case 'End':
      return addDays(isoDate, 6 - weekdayOf(isoDate))
    case 'PageUp':
      return shiftMonthKeepingDay(isoDate, -1)
    case 'PageDown':
      return shiftMonthKeepingDay(isoDate, 1)
    default:
      return null
  }
}

export function gridRange(ym: YearMonth): { from: string; to: string } {
  const cells = monthGrid(ym)
  return { from: cells[0].date, to: cells[cells.length - 1].date }
}

export function defaultSelection(ym: YearMonth, today: string): string {
  const current = monthOf(today)
  if (current.year === ym.year && current.month === ym.month) return today
  return `${formatMonthParam(ym)}-01`
}

export function isWeekend(isoDate: string): boolean {
  const weekday = weekdayOf(isoDate)
  return weekday === 0 || weekday === 6
}

export function weekdayHolidays(closedDates: readonly string[]): Set<string> {
  return new Set(closedDates.filter((date) => !isWeekend(date)))
}

export function formatDayTitle(isoDate: string): string {
  const { month } = monthOf(isoDate)
  return `${month}월 ${Number(isoDate.slice(8))}일 (${WEEKDAY_LABELS[weekdayOf(isoDate)]})`
}

export function formatDateSpan(start: string, end: string | null): string {
  if (!end || end === start) return formatShortDate(start)
  return `${formatShortDate(start)}–${formatShortDate(end)}`
}

function compareEvents(a: CalendarEventRes, b: CalendarEventRes): number {
  if (a.favorite !== b.favorite) return a.favorite ? -1 : 1
  const kindDiff = KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
  if (kindDiff !== 0) return kindDiff
  const nameDiff = a.stockName.localeCompare(b.stockName, 'ko')
  if (nameDiff !== 0) return nameDiff
  return a.ticker.localeCompare(b.ticker)
}

export function groupEventsByDate(events: readonly CalendarEventRes[]): Map<string, CalendarEventRes[]> {
  const buckets = new Map<string, CalendarEventRes[]>()
  for (const item of events) {
    const bucket = buckets.get(item.date)
    if (bucket) bucket.push(item)
    else buckets.set(item.date, [item])
  }
  const dates = [...buckets.keys()].sort()
  return new Map(dates.map((date) => [date, (buckets.get(date) ?? []).sort(compareEvents)]))
}

export function cellPreview<T>(items: readonly T[], max = 3): { shown: T[]; more: number } {
  return { shown: items.slice(0, max), more: Math.max(0, items.length - max) }
}

export function formatSharesPerShare(ratio: number): string {
  const shares = (ratio / 100).toLocaleString('ko-KR', { maximumFractionDigits: 4 })
  return `1주당 ${shares}주`
}

export function eventDetails(item: CalendarEventRes): string[] {
  const family = kindFamily(item.kind)
  if (family === 'DIV') {
    return [item.amount === null ? '배당금 미정' : `주당 ${formatWon(item.amount)}`]
  }
  if (family === 'BONUS') {
    return [item.ratio === null ? '배정 비율 미정' : formatSharesPerShare(item.ratio)]
  }
  if (family === 'RIGHTS') {
    const details: string[] = []
    if (item.kind === 'RIGHTS_SUBSCRIBE') details.push(`청약 ${formatDateSpan(item.date, item.endDate)}`)
    details.push(item.amount === null ? '발행가 미정' : `발행가 ${formatWon(item.amount)}`)
    if (item.ratio !== null) details.push(formatSharesPerShare(item.ratio))
    return details
  }
  return []
}

export interface IpoGroup {
  status: IpoStatus
  title: string
  items: IpoRes[]
}

function compareOptionalDate(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a < b ? -1 : 1
}

const IPO_SORT: Record<IpoStatus, (a: IpoRes, b: IpoRes) => number> = {
  SUBSCRIBING: (a, b) => compareOptionalDate(a.subscrEnd, b.subscrEnd),
  UPCOMING: (a, b) => compareOptionalDate(a.subscrStart, b.subscrStart),
  LISTING_PENDING: (a, b) =>
    compareOptionalDate(a.listingDate, b.listingDate) || compareOptionalDate(a.subscrEnd, b.subscrEnd),
  LISTED: (a, b) => compareOptionalDate(b.listingDate, a.listingDate),
}

export function groupIpos(offerings: readonly IpoRes[]): IpoGroup[] {
  return IPO_GROUP_ORDER.map((status) => ({
    status,
    title: IPO_GROUP_TITLES[status],
    items: offerings
      .filter((item) => item.status === status)
      .sort((a, b) => IPO_SORT[status](a, b) || a.name.localeCompare(b.name, 'ko')),
  })).filter((group) => group.items.length > 0)
}

export function ipoCountdown(item: IpoRes, today: string): string | null {
  if (item.status === 'UPCOMING') {
    const days = daysBetween(today, item.subscrStart)
    if (days <= 0) return null
    return days === 1 ? '내일 청약' : `청약 D-${days}`
  }
  if (item.status === 'SUBSCRIBING') {
    const days = daysBetween(today, item.subscrEnd)
    if (days < 0) return null
    return days === 0 ? '오늘 마감' : `마감 D-${days}`
  }
  if (item.status === 'LISTING_PENDING' && item.listingDate) {
    const days = daysBetween(today, item.listingDate)
    if (days < 0) return null
    return days === 0 ? '오늘 상장' : `상장 D-${days}`
  }
  return null
}
