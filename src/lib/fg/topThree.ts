import type { CandleRes, ThemeRes, ThemeStockRes } from '@/lib/apiTypes'
import { capWeight } from '@/lib/fg/themeDetail'
import { minusMonths } from '@/lib/fg/themeCharts'
import { buildReturnChart, type ReturnChart } from '@/lib/leaderChart'

export const TOP_THREE_LIMIT = 3
export const LEADER_CANDLE_LIMIT = 260

export type ReturnPeriod = '3m' | '6m' | '1y'

export const RETURN_PERIODS: readonly { value: ReturnPeriod; label: string; months: number }[] = [
  { value: '3m', label: '3개월', months: 3 },
  { value: '6m', label: '6개월', months: 6 },
  { value: '1y', label: '1년', months: 12 },
]

export const DEFAULT_RETURN_PERIOD: ReturnPeriod = '6m'

export interface TopThreeRow {
  ticker: string
  name: string
  market: string | null
  price: number | null
  change: number | null
  marketCap: number | null
  weight: number | null
}

export function topThreeRows(
  theme: Pick<ThemeRes, 'topStocks' | 'marketCap'>,
  stocks: readonly ThemeStockRes[] | null,
): TopThreeRow[] {
  const byTicker = new Map((stocks ?? []).map((stock) => [stock.ticker, stock]))
  return theme.topStocks.slice(0, TOP_THREE_LIMIT).map(({ ticker, name }) => {
    const stock = byTicker.get(ticker)
    const marketCap = stock?.marketCap ?? null
    return {
      ticker,
      name,
      market: stock?.market ?? null,
      price: stock?.price ?? null,
      change: stock?.change ?? null,
      marketCap,
      weight: capWeight(marketCap, theme.marketCap),
    }
  })
}

export function topThreeTitle(themeName: string, count: number): string {
  return `${themeName} ${count >= TOP_THREE_LIMIT ? '3대장' : '대장주'}`
}

export function topThreeGroup(count: number): string {
  return count >= TOP_THREE_LIMIT ? '3대장' : '대장주'
}

export function topThreeSubtitle(rows: readonly TopThreeRow[]): string {
  const head = `시가총액 상위 ${rows.length}종목`
  if (rows.length === 0 || rows.some((row) => row.weight === null)) return head
  const share = rows.reduce((sum, row) => sum + (row.weight ?? 0), 0)
  return `${head} · 테마 시가총액의 ${share.toFixed(1)}%`
}

export function leaderReturns(candleSets: readonly (CandleRes[] | null)[], months: number): ReturnChart | null {
  const latest = candleSets.reduce((last, set) => {
    const date = set && set.length > 0 ? set[set.length - 1].date : ''
    return date > last ? date : last
  }, '')
  if (latest === '') return null
  const target = minusMonths(latest, months)
  const trimmed = candleSets.map((set) => {
    if (!set || set.length === 0) return null
    let start = 0
    for (let i = set.length - 1; i >= 0; i--) {
      if (set[i].date <= target) {
        start = i
        break
      }
    }
    return set.slice(start)
  })
  return buildReturnChart(trimmed, Number.MAX_SAFE_INTEGER)
}

export interface SpreadPoint {
  index: number
  upper: number
  lower: number
}

export function spreadBand(chart: ReturnChart): SpreadPoint[] {
  const series = chart.series.filter((s) => s !== null)
  if (series.length < 2) return []
  const cursors = series.map(() => 0)
  const last: (number | undefined)[] = series.map(() => undefined)
  const band: SpreadPoint[] = []
  for (let index = 0; index < chart.dates.length; index++) {
    series.forEach((s, k) => {
      while (cursors[k] < s.points.length && s.points[cursors[k]].index <= index) {
        last[k] = s.points[cursors[k]].pct
        cursors[k] += 1
      }
    })
    const known = last.filter((v) => v !== undefined)
    if (known.length < 2) continue
    const mean = known.reduce((sum, v) => sum + v, 0) / known.length
    const sd = Math.sqrt(known.reduce((sum, v) => sum + (v - mean) ** 2, 0) / known.length)
    band.push({ index, upper: mean + sd, lower: mean - sd })
  }
  return band
}

export function returnRange(
  lines: { min: number; max: number },
  band: readonly SpreadPoint[],
): { min: number; max: number } {
  return {
    min: Math.min(lines.min, 0, ...band.map((b) => b.lower)),
    max: Math.max(lines.max, 0, ...band.map((b) => b.upper)),
  }
}
