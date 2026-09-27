import type { CandleRes } from '@/lib/apiTypes'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function lastTradingDate(candles: CandleRes[] | null | undefined): string | null {
  if (!candles || candles.length === 0) return null
  let latest = candles[0].date
  for (const c of candles) if (c.date > latest) latest = c.date
  return latest
}

export function formatTradingDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  return `${isoDate} (${weekday})`
}
