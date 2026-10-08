import type { CandlePeriod, CandleRes } from '@/lib/apiTypes'
import { formatChange } from '@/lib/format'
import { candleChangeAt } from '@/lib/fg/candleChange'
import { dayLabel, minusMonths, monthDayLabel } from '@/lib/fg/themeCharts'

export type PricePeriod = '1m' | '3m' | '6m' | '1y'

export const PRICE_PERIODS: readonly { value: PricePeriod; label: string; months: number }[] = [
  { value: '1m', label: '1달', months: 1 },
  { value: '3m', label: '3달', months: 3 },
  { value: '6m', label: '6달', months: 6 },
  { value: '1y', label: '1년', months: 12 },
]

export const DEFAULT_PRICE_PERIOD: PricePeriod = '3m'
export const RIGHT_OFFSET = 4
export const VOLUME_WINDOW = 20

export interface LogicalSpan {
  from: number
  to: number
}

interface RangeOption {
  value: string
  label: string
  months: number
}

export const WEEKLY_RANGES: readonly RangeOption[] = [
  { value: '1y', label: '1년', months: 12 },
  { value: '3y', label: '3년', months: 36 },
]

export const MONTHLY_RANGES: readonly RangeOption[] = [
  { value: '3y', label: '3년', months: 36 },
  { value: '5y', label: '5년', months: 60 },
]

export const DAILY_RANGES: readonly RangeOption[] = [
  ...PRICE_PERIODS,
  { value: '3y', label: '3년', months: 36 },
  { value: '5y', label: '5년', months: 60 },
  { value: 'all', label: '전체', months: 1200 },
]

export const DAILY_HISTORY_LIMIT = 2500
export const DAILY_LOADED_MONTHS = 12
export const DEEP_LOAD_EDGE = 5

export function needsDailyHistory(range: string): boolean {
  const months = DAILY_RANGES.find((option) => option.value === range)?.months ?? 0
  return months > DAILY_LOADED_MONTHS
}

export function shiftSpan(span: LogicalSpan, by: number): LogicalSpan {
  return { from: span.from + by, to: span.to + by }
}

export const RANGE_OPTIONS: Record<CandlePeriod, readonly RangeOption[]> = {
  D: DAILY_RANGES,
  W: WEEKLY_RANGES,
  M: MONTHLY_RANGES,
}

export const DEFAULT_RANGE: Record<CandlePeriod, string> = {
  D: DEFAULT_PRICE_PERIOD,
  W: WEEKLY_RANGES[0].value,
  M: MONTHLY_RANGES[0].value,
}

export const CANDLE_KIND_OPTIONS: readonly { value: CandlePeriod; label: string }[] = [
  { value: 'D', label: '일' },
  { value: 'W', label: '주' },
  { value: 'M', label: '월' },
]

export function kindLabel(kind: CandlePeriod): string {
  if (kind === 'W') return '주봉'
  if (kind === 'M') return '월봉'
  return '일봉'
}

function spanFromMonths(dates: readonly string[], months: number): LogicalSpan {
  const last = dates.length - 1
  const boundary = last >= 0 ? minusMonths(dates[last], months) : ''
  const start = Math.max(
    0,
    dates.findIndex((date) => date > boundary),
  )
  return { from: start - 0.5, to: last + 0.5 + RIGHT_OFFSET }
}

export function periodSpan(dates: readonly string[], period: PricePeriod): LogicalSpan {
  const months = PRICE_PERIODS.find((p) => p.value === period)?.months ?? 3
  return spanFromMonths(dates, months)
}

export function rangeSpan(dates: readonly string[], kind: CandlePeriod, range: string): LogicalSpan {
  const months = RANGE_OPTIONS[kind].find((option) => option.value === range)?.months ?? 3
  return spanFromMonths(dates, months)
}

function parseKind(value: string | null): CandlePeriod {
  if (value === 'w') return 'W'
  if (value === 'm') return 'M'
  return 'D'
}

function kindParam(kind: CandlePeriod): string {
  return kind.toLowerCase()
}

export function parseChartKind(search: string): CandlePeriod {
  return parseKind(new URLSearchParams(search).get('chart'))
}

export function parseChartRange(search: string, kind: CandlePeriod): string {
  const value = new URLSearchParams(search).get('range')
  const valid = value !== null && RANGE_OPTIONS[kind].some((option) => option.value === value)
  return valid ? value : DEFAULT_RANGE[kind]
}

export function chartSearch(search: string, kind: CandlePeriod, range: string): string {
  const params = new URLSearchParams(search)
  if (kind === 'D' && range === DEFAULT_RANGE.D) {
    params.delete('chart')
    params.delete('range')
  } else {
    params.set('chart', kindParam(kind))
    params.set('range', range)
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

export function spanMoved(expected: LogicalSpan, actual: LogicalSpan): boolean {
  return Math.abs(actual.from - expected.from) > 1 || Math.abs(actual.to - expected.to) > 1
}

export function isAway(span: LogicalSpan, count: number): boolean {
  return span.to < count - 1.5
}

export function zoomSpan(span: LogicalSpan, anchor: number, factor: number): LogicalSpan {
  return { from: anchor - (anchor - span.from) * factor, to: anchor + (span.to - anchor) * factor }
}

export function revealSpan(span: LogicalSpan, index: number): LogicalSpan | null {
  if (index >= span.from + 1 && index <= span.to - 1) return null
  const width = span.to - span.from
  const from = Math.max(-0.5, index - width * 0.6)
  return { from, to: from + width }
}

export function followSpan(span: LogicalSpan, index: number): LogicalSpan | null {
  if (index >= span.from + 0.5 && index <= span.to - 0.5) return null
  const width = span.to - span.from
  const from = index < span.from + 0.5 ? index - 1 : index - width + 2
  return { from, to: from + width }
}

export function keyboardIndex(key: string, shift: boolean, current: number | null, count: number): number | null {
  if (count === 0) return null
  const last = count - 1
  let next: number
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const step = (key === 'ArrowLeft' ? -1 : 1) * (shift ? 5 : 1)
    next = current === null ? last : current + step
  } else if (key === 'Home') next = 0
  else if (key === 'End') next = last
  else return null
  return Math.max(0, Math.min(last, next))
}

export function formatChartPrice(value: number): string {
  return Math.round(value).toLocaleString('ko-KR')
}

export function formatChartVolume(volume: number): string {
  if (volume >= 1e8) return `${(volume / 1e8).toFixed(1)}억`
  if (volume >= 1e4) return `${Math.round(volume / 1e4).toLocaleString('ko-KR')}만`
  return volume.toLocaleString('ko-KR')
}

export interface Legend {
  date: string
  open: string
  high: string
  low: string
  close: string
  change: number | null
  volume: string
}

export function periodLabel(date: string, kind: CandlePeriod, refYear: number): string {
  if (kind === 'W') return `${monthDayLabel(date, refYear)} 주`
  if (kind === 'M') return `${date.slice(0, 4)}년 ${Number(date.slice(5, 7))}월`
  return dayLabel(date, refYear)
}

export function legendAt(candles: readonly CandleRes[], index: number, kind: CandlePeriod = 'D'): Legend | null {
  const candle = candles[index]
  if (!candle) return null
  const year = Number(candles[candles.length - 1].date.slice(0, 4))
  return {
    date: periodLabel(candle.date, kind, year),
    open: formatChartPrice(candle.open),
    high: formatChartPrice(candle.high),
    low: formatChartPrice(candle.low),
    close: formatChartPrice(candle.close),
    change: candleChangeAt(candles, index),
    volume: formatChartVolume(candle.volume),
  }
}

export function chartValueText(
  candles: readonly CandleRes[],
  index: number,
  markerTitle: string | null,
  markerLabel = '이슈',
  kind: CandlePeriod = 'D',
): string {
  const legend = legendAt(candles, index, kind)
  if (!legend) return ''
  const parts = [
    legend.date,
    `시가 ${legend.open}원`,
    `고가 ${legend.high}원`,
    `저가 ${legend.low}원`,
    `종가 ${legend.close}원`,
    ...(legend.change === null ? [] : [formatChange(legend.change)]),
    `거래량 ${legend.volume}주`,
    ...(markerTitle ? [`${markerLabel}: ${markerTitle}`] : []),
  ]
  return parts.join(', ')
}

export type TickKind = 'year' | 'month' | 'day'

export function tickLabel(isoDate: string, kind: TickKind): string {
  if (kind === 'year') return isoDate.slice(0, 4)
  if (kind === 'month') return `${Number(isoDate.slice(5, 7))}월`
  return String(Number(isoDate.slice(8, 10)))
}

type TimeValue = string | number | { year: number; month: number; day: number }

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function isoOfTime(time: TimeValue): string {
  if (typeof time === 'string') return time.slice(0, 10)
  if (typeof time === 'number') return new Date(time * 1000).toISOString().slice(0, 10)
  return `${time.year}-${pad(time.month)}-${pad(time.day)}`
}

export function withAlpha(color: string, alpha: number): string {
  const hex = color.trim()
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex)
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  const parts = long ? long.slice(1) : short ? short.slice(1).map((c) => c + c) : null
  if (!parts) return color
  const [r, g, b] = parts.map((part) => parseInt(part, 16))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function volumeRatio(candles: readonly CandleRes[], index: number, window = VOLUME_WINDOW): number | null {
  const before = candles.slice(Math.max(0, index - window), index)
  const candle = candles[index]
  if (!candle || before.length === 0) return null
  const mean = before.reduce((sum, c) => sum + c.volume, 0) / before.length
  return mean > 0 ? candle.volume / mean : null
}
