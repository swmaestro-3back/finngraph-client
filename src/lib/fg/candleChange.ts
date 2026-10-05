import type { CandleRes } from '@/lib/apiTypes'

export function candleChangeAt(candles: readonly CandleRes[], index: number): number | null {
  const candle = candles[index]
  if (!candle) return null
  if (typeof candle.changeRate === 'number') return candle.changeRate
  const prev = candles[index - 1]
  return prev && prev.close > 0 ? (candle.close / prev.close - 1) * 100 : null
}
