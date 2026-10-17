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


export interface PriceBasis {
  baseDate?: string | null
  valuationDate?: string | null
  updatedAt?: string | null
}

const KST_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function intradayTime(basis: PriceBasis | null | undefined): string | null {
  if (!basis?.baseDate || !basis.valuationDate || !basis.updatedAt) return null
  if (basis.valuationDate === basis.baseDate) return null
  const at = new Date(basis.updatedAt)
  if (Number.isNaN(at.getTime())) return null
  return KST_TIME.format(at)
}

export function priceBasisSuffix(basis: PriceBasis | null | undefined): string {
  const time = intradayTime(basis)
  return time ? `${time} 기준` : '종가 기준'
}

export function stockPriceBasisLabel(basis: Pick<PriceBasis, 'baseDate' | 'valuationDate'> | null | undefined): string | null {
  if (!basis?.baseDate) return null
  const [, m, d] = basis.baseDate.split('-').map(Number)
  if (!m || !d) return null
  const day = `${m}/${d}`
  return basis.valuationDate && basis.valuationDate < basis.baseDate ? `${day} 시세 · 장중 매시 갱신` : `${day} 종가`
}
