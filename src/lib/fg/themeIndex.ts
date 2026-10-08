import type { ThemeIndexRes } from '@/lib/apiTypes'
import { minusMonths, monthDayLabel, periodStartIndex } from '@/lib/fg/themeCharts'

export const INDEX_CANDLE_LIMIT = 260

interface DatedClose {
  date: string
  close: number
}

export function indexWindow<T extends DatedClose>(candles: readonly T[], months: number): T[] {
  return candles.slice(periodStartIndex(candles.map((c) => c.date), months))
}

export interface Week52Dates {
  high: string
  low: string
}

type Week52Index = Pick<ThemeIndexRes, 'date' | 'high52w' | 'low52w'>

function sameValue(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(Math.abs(b), 1) * 1e-6
}

export function week52Dates(candles: readonly DatedClose[], index: Week52Index, complete: boolean): Week52Dates | null {
  const yearAgo = minusMonths(index.date, 12)
  const covered = complete || candles.some((c) => c.date <= yearAgo)
  if (!covered) return null
  let high: DatedClose | null = null
  let low: DatedClose | null = null
  for (const candle of candles) {
    if (candle.date <= yearAgo || candle.date > index.date) continue
    if (high === null || candle.close >= high.close) high = candle
    if (low === null || candle.close <= low.close) low = candle
  }
  if (high === null || low === null) return null
  if (!sameValue(high.close, index.high52w) || !sameValue(low.close, index.low52w)) return null
  return { high: high.date, low: low.date }
}

export function streakLabel(streak: number): string | null {
  if (Math.abs(streak) < 2) return null
  return `${Math.abs(streak)}일 연속 ${streak > 0 ? '상승' : '하락'}`
}

export function formatIndexValue(value: number): string {
  return value.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function week52Label(index: Week52Index, dates: Week52Dates | null): string {
  const year = Number(index.date.slice(0, 4))
  const when = (date: string | undefined) => (date ? `(${monthDayLabel(date, year)})` : '')
  return `52주 최저 ${formatIndexValue(index.low52w)}${when(dates?.low)} · 최고 ${formatIndexValue(index.high52w)}${when(dates?.high)}`
}
