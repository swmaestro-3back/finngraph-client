export type CandlePeriod = 'D' | 'W' | 'M'

export interface Candle {
  open: number
  high: number
  low: number
  close: number
  volume: number
  label: string
}

export const CANDLE_COUNTS: Record<CandlePeriod, number> = { D: 65, W: 52, M: 36 }

export interface CandleDate {
  label: string
  date: string
}

function candleDate(index: number, count: number, period: CandlePeriod): CandleDate {
  const base = new Date(2026, 6, 31)
  const stepDays = period === 'D' ? 1 : period === 'W' ? 7 : 30
  const d = new Date(base)
  d.setDate(base.getDate() - (count - 1 - index) * stepDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return {
    label: period === 'M' ? `${y}.${m}` : `${d.getMonth() + 1}/${d.getDate()}`,
    date: `${y}.${m}.${String(d.getDate()).padStart(2, '0')}`,
  }
}

export function candleDates(period: CandlePeriod): CandleDate[] {
  const count = CANDLE_COUNTS[period]
  return Array.from({ length: count }, (_, i) => candleDate(i, count, period))
}
