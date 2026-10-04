import type {
  ActionStepRes,
  AnnualFinancials,
  CalendarEventKind,
  CalendarEventRes,
  CalendarFamily,
  CorporateActionRes,
  DividendReactionRes,
  ExPriceBasis,
  IpoRes,
  IpoStatus,
} from '@/lib/apiTypes'
import { formatWon } from '@/lib/format'
import { formatMonthDay } from '@/lib/themeMetrics'

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

export type EventFamily = CalendarFamily

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
  FILED: '신고서 제출',
  UPCOMING: '청약 예정',
  SUBSCRIBING: '청약 중',
  LISTING_PENDING: '상장 예정',
  LISTED: '상장',
}

const IPO_GROUP_TITLES: Record<IpoStatus, string> = {
  FILED: '신고서 제출',
  SUBSCRIBING: '청약 중',
  UPCOMING: '청약 예정',
  LISTING_PENDING: '상장 예정',
  LISTED: '최근 상장',
}

const IPO_GROUP_NOTES: Partial<Record<IpoStatus, string>> = {
  FILED: '예탁원 청약 일정이 나오기 전 증권신고서 기준이라 일정이 바뀔 수 있습니다',
}

const IPO_GROUP_PREVIEWS: Partial<Record<IpoStatus, number>> = {
  FILED: 5,
}

const IPO_GROUP_ORDER: readonly IpoStatus[] = ['SUBSCRIBING', 'UPCOMING', 'LISTING_PENDING', 'LISTED', 'FILED']

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
  if (!end || end === start) return formatMonthDay(start)
  return `${formatMonthDay(start)}–${formatMonthDay(end)}`
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

export type EventValues = Pick<CalendarEventRes, 'kind' | 'date' | 'endDate' | 'amount' | 'ratio'>

export function eventDetails(item: EventValues): string[] {
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
  note: string | null
  preview: number | null
  items: IpoRes[]
}

function compareOptionalDate(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a < b ? -1 : 1
}

const IPO_SORT: Record<IpoStatus, (a: IpoRes, b: IpoRes) => number> = {
  FILED: (a, b) => compareOptionalDate(a.subscrStart, b.subscrStart),
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
    note: IPO_GROUP_NOTES[status] ?? null,
    preview: IPO_GROUP_PREVIEWS[status] ?? null,
    items: offerings
      .filter((item) => item.status === status)
      .sort((a, b) => IPO_SORT[status](a, b) || a.name.localeCompare(b.name, 'ko')),
  })).filter((group) => group.items.length > 0)
}

export function groupPreview(group: IpoGroup, expanded: boolean): { items: IpoRes[]; hidden: number } {
  if (expanded || group.preview === null || group.items.length <= group.preview) return { items: group.items, hidden: 0 }
  return { items: group.items.slice(0, group.preview), hidden: group.items.length - group.preview }
}

export function previewToggleLabel(group: IpoGroup, expanded: boolean): string {
  return expanded ? '접기' : `${group.title} ${group.items.length}건 모두 보기`
}

export function ipoShowsSettlement(item: Pick<IpoRes, 'status'>): boolean {
  return item.status !== 'FILED'
}

export function ipoCountdown(
  item: Pick<IpoRes, 'status' | 'subscrStart' | 'subscrEnd' | 'listingDate'>,
  today: string,
): string | null {
  if (item.status === 'UPCOMING' || item.status === 'FILED') {
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

export const STOCK_CALENDAR_WINDOW_DAYS = 180

export interface EventDetailTarget {
  ticker: string
  kind: CalendarEventKind
  date: string
  label: string | null
}

export function stockCalendarWindow(date: string): { from: string; to: string } {
  return { from: addDays(date, -STOCK_CALENDAR_WINDOW_DAYS), to: addDays(date, STOCK_CALENDAR_WINDOW_DAYS) }
}

export function findEvent(events: readonly CalendarEventRes[], target: EventDetailTarget): CalendarEventRes | null {
  return (
    events.find(
      (item) =>
        item.ticker === target.ticker &&
        item.kind === target.kind &&
        item.date === target.date &&
        item.label === target.label,
    ) ?? null
  )
}

export function actionKey(action: CorporateActionRes): string {
  return `${action.family}|${action.basisDate}|${action.label ?? ''}`
}

export function findAction(
  actions: readonly CorporateActionRes[],
  kind: CalendarEventKind,
  date: string,
  label: string | null = null,
): CorporateActionRes | null {
  const matches = actions.filter((action) => action.steps.some((step) => step.kind === kind && step.date === date))
  return matches.find((action) => action.label === label) ?? matches[0] ?? null
}

export interface ActionFocus {
  key: string | null
  kind: CalendarEventKind
  date: string
}

export function selectAction(
  actions: readonly CorporateActionRes[],
  focus: ActionFocus,
  label: string | null = null,
): CorporateActionRes | null {
  if (focus.key !== null) return actions.find((action) => actionKey(action) === focus.key) ?? null
  return findAction(actions, focus.kind, focus.date, label)
}

export type StepState = 'past' | 'today' | 'upcoming'

export function stepState(span: { date: string; endDate: string | null }, today: string): StepState {
  if ((span.endDate ?? span.date) < today) return 'past'
  if (span.date > today) return 'upcoming'
  return 'today'
}

export function dDay(date: string, today: string): string {
  const days = daysBetween(today, date)
  if (days === 0) return '오늘'
  return days > 0 ? `D-${days}` : `D+${-days}`
}

export function spanCountdown(span: { date: string; endDate: string | null }, today: string): string {
  const state = stepState(span, today)
  if (state === 'past') return '지남'
  if (state === 'today') return span.endDate !== null && span.endDate !== span.date ? '진행 중' : '오늘'
  return dDay(span.date, today)
}

export interface TimelineRow {
  state: StepState | null
  dateText: string
  countdown: string | null
}

export function timelineRow(span: { date: string | null; endDate: string | null }, today: string): TimelineRow {
  if (span.date === null) return { state: null, dateText: '미정', countdown: null }
  const dated = { date: span.date, endDate: span.endDate }
  return {
    state: stepState(dated, today),
    dateText: formatDateSpan(span.date, span.endDate),
    countdown: spanCountdown(dated, today),
  }
}

export function nextStepIndex(items: readonly { date: string | null; endDate: string | null }[], today: string): number {
  return items.findIndex((item) => timelineRow(item, today).state !== 'past')
}

export function focusStep(action: CorporateActionRes, today: string): ActionStepRes | null {
  return action.steps.find((step) => stepState(step, today) !== 'past') ?? action.steps.at(-1) ?? null
}

export function formatDayRange(date: string, endDate: string | null): string {
  if (!endDate || endDate === date) return formatDayTitle(date)
  return `${formatDayTitle(date)} – ${formatDayTitle(endDate)}`
}

export const BASIS_LABELS: Record<EventFamily, string> = {
  DIV: '배당 기준일',
  BONUS: '신주배정 기준일',
  RIGHTS: '신주배정 기준일',
  AGM: '주주명부 기준일',
}

export interface TimelineItem {
  key: string
  kind: CalendarEventKind | 'BASIS' | 'LAST_BUY'
  label: string
  date: string
  endDate: string | null
  estimated: boolean
}

export function timelineItems(action: CorporateActionRes): TimelineItem[] {
  const steps: TimelineItem[] = action.steps.map((step) => ({
    key: `${step.kind}|${step.date}`,
    kind: step.kind,
    label: KIND_LABELS[step.kind],
    date: step.date,
    endDate: step.endDate,
    estimated: step.estimated,
  }))
  const lastBuy: TimelineItem = {
    key: `LAST_BUY|${action.lastBuyDate}`,
    kind: 'LAST_BUY',
    label: '매수 마감',
    date: action.lastBuyDate,
    endDate: null,
    estimated: action.lastBuyEstimated,
  }
  if (action.steps.some((step) => step.kind === 'DIV_RECORD')) return [lastBuy, ...steps]
  const basis: TimelineItem = {
    key: `BASIS|${action.basisDate}`,
    kind: 'BASIS',
    label: BASIS_LABELS[action.family],
    date: action.basisDate,
    endDate: null,
    estimated: false,
  }
  const at = steps.findIndex((item) => item.date > action.basisDate)
  return [lastBuy, ...(at === -1 ? [...steps, basis] : [...steps.slice(0, at), basis, ...steps.slice(at)])]
}

export const KIND_DESCRIPTIONS: Record<CalendarEventKind, string> = {
  DIV_EX: '이날부터 산 주식은 이번 배당을 받지 못합니다. 배당만큼 주가가 낮게 출발하기도 합니다.',
  DIV_RECORD: '이날 주주명부에 오른 주주가 배당을 받습니다. 결제에 2거래일이 걸려 매수는 그 전에 끝내야 합니다.',
  DIV_PAY: '배당금이 주주 계좌로 들어오는 날입니다.',
  BONUS_EX: '이날부터 산 주식은 무상 신주를 받지 못합니다. 늘어나는 주식 수만큼 기준가가 낮게 조정됩니다.',
  BONUS_LIST: '무상으로 받은 신주가 상장돼 거래할 수 있게 되는 날입니다.',
  RIGHTS_EX: '이날부터 산 주식은 유상 신주를 배정받지 못합니다. 기준가가 권리락 이론가로 조정됩니다.',
  RIGHTS_SUBSCRIBE: '신주를 배정받은 주주가 발행가로 청약하는 기간입니다.',
  RIGHTS_LIST: '유상으로 발행한 신주가 상장돼 거래할 수 있게 되는 날입니다.',
  AGM: '주주가 안건에 의결권을 행사하는 날입니다. 기준일에 주주명부에 올라 있어야 참석할 수 있습니다.',
}

export function agendaCountLabel(item: { agenda: readonly unknown[]; agendaTruncated: boolean }): string | null {
  if (item.agenda.length === 0) return null
  return item.agendaTruncated ? `안건 ${item.agenda.length}건 이상` : `안건 ${item.agenda.length}건`
}

export interface EventSummaryModel {
  kind: CalendarEventKind
  date: string
  endDate: string | null
  estimated: boolean
  label: string | null
  details: string[]
  lastBuy: { date: string; estimated: boolean } | null
}

export function summaryFromAction(action: CorporateActionRes, kind: CalendarEventKind, date: string): EventSummaryModel {
  const step = action.steps.find((item) => item.kind === kind && item.date === date)
  const endDate = step?.endDate ?? null
  return {
    kind,
    date,
    endDate,
    estimated: step?.estimated ?? false,
    label: action.label,
    details: eventDetails({ kind, date, endDate, amount: action.amount, ratio: action.ratio }),
    lastBuy: { date: action.lastBuyDate, estimated: action.lastBuyEstimated },
  }
}

export function summaryFromRow(target: EventDetailTarget, row: CalendarEventRes | null): EventSummaryModel {
  if (!row) {
    return { kind: target.kind, date: target.date, endDate: null, estimated: false, label: null, details: [], lastBuy: null }
  }
  return {
    kind: row.kind,
    date: row.date,
    endDate: row.endDate,
    estimated: row.estimated,
    label: row.label,
    details: eventDetails(row),
    lastBuy: null,
  }
}

export const RECOVERY_WINDOW_DAYS = 5
export const REACTION_MAX_DAYS = 60

export interface RecoverySummary {
  total: number
  recovered: number
  pending: number
}

export function summarizeRecovery(rows: readonly DividendReactionRes[]): RecoverySummary {
  const settled = rows.filter((row) => !row.pending)
  return {
    total: settled.length,
    recovered: settled.filter((row) => row.recoveryDays !== null && row.recoveryDays <= RECOVERY_WINDOW_DAYS).length,
    pending: rows.length - settled.length,
  }
}

export function formatRecoverySummary(summary: RecoverySummary): string | null {
  const pending = summary.pending > 0 ? `${summary.pending}회 집계 중` : null
  if (summary.total === 0) return pending
  const head = `${summary.total}회 중 ${summary.recovered}회 ${RECOVERY_WINDOW_DAYS}거래일 내 회복`
  return pending ? `${head} · ${pending}` : head
}

export function recoveryLabel(row: DividendReactionRes): string {
  if (row.pending) return '집계 중'
  if (row.recoveryDays === null) return `${REACTION_MAX_DAYS}거래일 내 미회복`
  if (row.recoveryDays === 1) return '당일 회복'
  return `${row.recoveryDays}거래일째 회복`
}

export function latestPayoutRatio(rows: readonly AnnualFinancials[]): { year: number; value: number } | null {
  let latest: { year: number; value: number } | null = null
  for (const row of rows) {
    if (row.estimated || row.payoutRatio === null) continue
    if (latest === null || row.year > latest.year) latest = { year: row.year, value: row.payoutRatio }
  }
  return latest
}

export function candleIndexOn(candles: readonly { date: string }[], date: string): number | null {
  const index = candles.findIndex((candle) => candle.date === date)
  return index === -1 ? null : index
}

export function formatFullDate(isoDate: string): string {
  return isoDate.replaceAll('-', '.')
}

export function metricText(value: number | null, format: (value: number) => string, sourceMissing: boolean): string {
  if (sourceMissing) return '미정'
  return value === null ? '—' : format(value)
}

export const EX_PRICE_BASIS_LABELS: Record<ExPriceBasis, string> = {
  PREVIOUS_CLOSE: '권리락 전날 종가로 계산한 확정값',
  CURRENT_PRICE: '현재가로 계산한 참고값',
}

export function exPriceMissing(basis: ExPriceBasis, inputsMissing: boolean): boolean {
  return basis === 'CURRENT_PRICE' && inputsMissing
}
