export type Week52State = 'high' | 'low' | 'normal'

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
