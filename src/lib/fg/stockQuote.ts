import type { CandleRes, InvestorFlowRes, ThemeStockChangeStatus, ThemeStockRes } from '@/lib/apiTypes'
import { minusMonths } from '@/lib/fg/themeCharts'
import { indexWindow } from '@/lib/fg/themeIndex'
import type { Week52Basis, Week52State } from '@/lib/fg/week52'

export const QUOTE_CANDLE_LIMIT = 260
export const SPARK_MONTHS = 3
export const FLOW_DAYS = 5
export const WEEK52_BASIS: Week52Basis = 'close'

export interface Week52Stats {
  high: number
  highDate: string
  low: number
  lowDate: string
}

export function week52FromCandles(candles: readonly CandleRes[], complete: boolean): Week52Stats | null {
  if (candles.length === 0) return null
  const last = candles[candles.length - 1].date
  const yearAgo = minusMonths(last, 12)
  if (!complete && !candles.some((c) => c.date <= yearAgo)) return null
  let high: CandleRes | null = null
  let low: CandleRes | null = null
  for (const candle of candles) {
    if (candle.date <= yearAgo) continue
    if (high === null || candle.close > high.close) high = candle
    if (low === null || candle.close < low.close) low = candle
  }
  if (high === null || low === null) return null
  return { high: high.close, highDate: high.date, low: low.close, lowDate: low.date }
}

export function week52State(range: Week52Stats, last: Pick<CandleRes, 'date' | 'volume'>): Week52State {
  if (!(range.high > range.low) || last.volume === 0) return 'normal'
  if (range.highDate === last.date) return 'high'
  if (range.lowDate === last.date) return 'low'
  return 'normal'
}

export interface Week52Summary {
  range: Week52Stats
  state: Week52State
  asOf: string
}

export function week52Summary(candles: readonly CandleRes[]): Week52Summary | null {
  const range = week52FromCandles(candles, candles.length < QUOTE_CANDLE_LIMIT)
  const last = candles.length > 0 ? candles[candles.length - 1] : null
  return range && last ? { range, state: week52State(range, last), asOf: last.date } : null
}

export type StockStatus = Extract<ThemeStockChangeStatus, 'SUSPENDED' | 'DELISTING'>

export type StockStatusRow = Pick<ThemeStockRes, 'changeStatus' | 'tradingSuspended' | 'delistingTrade'>

function hasStatus(row: StockStatusRow): boolean {
  return row.changeStatus !== undefined || row.tradingSuspended !== undefined || row.delistingTrade !== undefined
}

export function stockStatus(
  row: StockStatusRow | null,
  candles: readonly Pick<CandleRes, 'volume'>[] | null,
): StockStatus | null {
  if (row && hasStatus(row)) {
    if (row.delistingTrade === true || row.changeStatus === 'DELISTING') return 'DELISTING'
    if (row.tradingSuspended === true || row.changeStatus === 'SUSPENDED') return 'SUSPENDED'
    return null
  }
  const last = candles && candles.length > 0 ? candles[candles.length - 1] : null
  return last !== null && last.volume === 0 ? 'SUSPENDED' : null
}

export function changeAmount(
  candles: readonly CandleRes[],
  price: number | null,
  change: number | null,
  reported?: number | null,
): number | null {
  if (typeof reported === 'number') return reported
  if (candles.length < 2 || price === null || change === null) return null
  const last = candles[candles.length - 1]
  const prev = candles[candles.length - 2]
  if (last.close !== price || !(prev.close > 0)) return null
  const implied = (last.close / prev.close - 1) * 100
  if (Math.abs(implied - change) > 0.01) return null
  return last.close - prev.close
}

export interface SparkPoint {
  date: string
  close: number
}

export interface SparkModel {
  line: string
  area: string
  dotTop: number
  first: SparkPoint
  last: SparkPoint
  move: number
}

const SPARK_W = 300
const SPARK_H = 56
const SPARK_PAD = 4

export function sparkModel(candles: readonly CandleRes[], months: number): SparkModel | null {
  const window = indexWindow(candles, months)
  if (window.length < 2) return null
  const closes = window.map((c) => c.close)
  const lo = Math.min(...closes)
  const hi = Math.max(...closes)
  const span = hi - lo
  const x = (i: number) => (i / (closes.length - 1)) * SPARK_W
  const y = (v: number) => (span === 0 ? SPARK_H / 2 : SPARK_PAD + (1 - (v - lo) / span) * (SPARK_H - SPARK_PAD * 2))
  const points = closes.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('L')
  const first = window[0]
  const last = window[window.length - 1]
  return {
    line: `M${points}`,
    area: `M0,${SPARK_H}L${points}L${SPARK_W},${SPARK_H}Z`,
    dotTop: (y(last.close) / SPARK_H) * 100,
    first: { date: first.date, close: first.close },
    last: { date: last.date, close: last.close },
    move: first.close === 0 ? 0 : (last.close / first.close - 1) * 100,
  }
}

export interface FlowTotals {
  foreign: number | null
  institution: number | null
  individual: number | null
  days: number
  from: string
  to: string
  foreignRatio: number | null
}

function sumOf(values: readonly (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null)
  return present.length === 0 ? null : present.reduce((a, b) => a + b, 0)
}

export function flowTotals(flows: readonly InvestorFlowRes[]): FlowTotals | null {
  if (flows.length === 0) return null
  const ratio = [...flows].reverse().find((f) => f.foreignRatio !== null)?.foreignRatio ?? null
  return {
    foreign: sumOf(flows.map((f) => f.foreignNet)),
    institution: sumOf(flows.map((f) => f.institutionNet)),
    individual: sumOf(flows.map((f) => f.individualNet)),
    days: flows.length,
    from: flows[0].date,
    to: flows[flows.length - 1].date,
    foreignRatio: ratio,
  }
}

export function formatManShares(shares: number): string {
  const man = Math.round(shares / 1e3) / 10
  const text = Math.abs(man).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  if (man > 0) return `+${text}`
  if (man < 0) return `−${text}`
  return text
}

export function formatTimes(value: number | null): string {
  if (value === null) return '—'
  const text = `${Math.abs(value).toFixed(1)}배`
  return value < 0 && text !== '0.0배' ? `−${text}` : text
}

export function formatRatio(value: number | null): string {
  if (value === null) return '—'
  const text = `${Math.abs(value).toFixed(1)}%`
  return value < 0 && text !== '0.0%' ? `−${text}` : text
}

export type ThemeStockRow = Pick<ThemeStockRes, 'ticker' | 'tradingValue'> & StockStatusRow

export function tradingValueOf(stocks: readonly Pick<ThemeStockRes, 'ticker' | 'tradingValue'>[] | null, ticker: string): number | null {
  return stocks?.find((stock) => stock.ticker === ticker)?.tradingValue ?? null
}

export function statusOf(
  stocks: readonly (Pick<ThemeStockRes, 'ticker'> & StockStatusRow)[] | null,
  ticker: string,
  candles: readonly Pick<CandleRes, 'volume'>[] | null,
): StockStatus | null {
  return stockStatus(stocks?.find((stock) => stock.ticker === ticker) ?? null, candles)
}

export interface StockSummary {
  loading: boolean
  candlesFailed: boolean
  amount: number | null
  week52: Week52Summary | null
  spark: SparkModel | null
  flows: FlowTotals | null
  flowsLoading: boolean
  flowsFailed: boolean
  tradingValue: number | null
  tradingLoading: boolean
  tradingFailed: boolean
  status: StockStatus | null
}

export interface SummaryFailures {
  candles?: boolean
  flows?: boolean
  themeStocks?: boolean
}

interface StockSummaryInput {
  ticker: string
  price: number | null
  change: number | null
  amount?: number | null
  candles: readonly CandleRes[] | null
  flows: readonly InvestorFlowRes[] | null
  themeStocks: readonly ThemeStockRow[] | null
  failed?: SummaryFailures
}

export function stockSummary({
  ticker,
  price,
  change,
  amount,
  candles,
  flows,
  themeStocks,
  failed = {},
}: StockSummaryInput): StockSummary {
  const candlesFailed = failed.candles === true
  const flowsFailed = failed.flows === true
  const tradingFailed = failed.themeStocks === true
  return {
    loading: candles === null && !candlesFailed,
    candlesFailed,
    amount: changeAmount(candles ?? [], price, change, amount),
    week52: candles ? week52Summary(candles) : null,
    spark: candles ? sparkModel(candles, SPARK_MONTHS) : null,
    flows: flows ? flowTotals(flows) : null,
    flowsLoading: flows === null && !flowsFailed,
    flowsFailed,
    tradingValue: tradingValueOf(themeStocks, ticker),
    tradingLoading: themeStocks === null && !tradingFailed,
    tradingFailed,
    status: statusOf(themeStocks, ticker, candles),
  }
}
