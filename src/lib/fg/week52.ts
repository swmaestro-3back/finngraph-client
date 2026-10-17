import { formatPriceWon } from '@/lib/fg/format'
import { monthDayLabel } from '@/lib/fg/themeCharts'

export type Week52State = 'high' | 'low' | 'normal'

export type Week52Basis = 'close' | 'intraday'

export const WEEK52_BASIS_LABEL: Record<Week52Basis, string> = {
  close: '종가 기준',
  intraday: '장중 고가·저가 기준',
}

interface Week52Input {
  price: number
  high: number
  low: number
}

export function week52Position({ price, high, low }: Week52Input): number | null {
  if (!(high > low)) return null
  return Math.min(1, Math.max(0, (price - low) / (high - low)))
}

export function gapFromHigh(price: number, high: number): number {
  if (!(high > 0)) return 0
  return ((price - high) / high) * 100
}

export function week52GroupLabel(name: string, basis: Week52Basis, asOf: string | null): string {
  const until = asOf ? ` · ${monthDayLabel(asOf, Number(asOf.slice(0, 4)))}까지` : ''
  return `${name} 52주 범위 · ${WEEK52_BASIS_LABEL[basis]}${until}`
}

export function week52ValueText(input: Week52Input): string {
  const position = week52Position(input)
  const range = `현재 ${formatPriceWon(input.price)}, 최저 ${formatPriceWon(input.low)}부터 최고 ${formatPriceWon(input.high)}`
  return position === null ? range : `${range} 사이 ${Math.round(position * 100)}% 위치`
}

export function week52RecordDay(asOf: string | null, today: string | null): string {
  if (!asOf || asOf === today) return '오늘'
  return monthDayLabel(asOf, Number((today ?? asOf).slice(0, 4)))
}
