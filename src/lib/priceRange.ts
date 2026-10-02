import type { CandleRes } from '@/lib/apiTypes'

/** 주봉 52개 = 52주 — 일봉 250개보다 가볍게 같은 고·저를 얻는다 */
export const FIFTY_TWO_WEEKS = 52

export interface PriceRange {
  low: number
  high: number
  price: number
  /** 범위 안 현재가 위치 0(최저)~1(최고) */
  position: number
  /** 최저가 대비 현재가 등락(%) — 항상 0 이상 */
  fromLow: number
  /** 최고가 대비 현재가 등락(%) — 항상 0 이하 */
  fromHigh: number
}

/**
 * 캔들 구간의 고·저와 그 안에서 현재가 위치.
 * 장중 현재가가 마지막 캔들의 고·저를 넘을 수 있어 현재가도 범위에 넣는다 — 막대 밖으로 튀지 않도록.
 * 현재가가 없으면 마지막 종가를 쓴다.
 */
export function priceRange(candles: CandleRes[], price: number | null): PriceRange | null {
  if (candles.length === 0) return null
  const current = price ?? candles[candles.length - 1].close
  let low = current
  let high = current
  for (const c of candles) {
    if (c.low < low) low = c.low
    if (c.high > high) high = c.high
  }
  if (low <= 0) return null
  return {
    low,
    high,
    price: current,
    position: high === low ? 0.5 : (current - low) / (high - low),
    fromLow: ((current - low) / low) * 100,
    fromHigh: ((current - high) / high) * 100,
  }
}
