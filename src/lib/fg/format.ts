export type Tone = 'up' | 'down' | 'flat'

export function toneOf(value: number | null | undefined): Tone {
  if (value === null || value === undefined || value === 0 || Number.isNaN(value)) return 'flat'
  return value > 0 ? 'up' : 'down'
}

export function toneClass(value: number | null | undefined): string {
  return `fg-${toneOf(value)}`
}

export function marketLabel(market: string | null | undefined): string {
  if (market === 'KOSPI') return '코스피'
  if (market === 'KOSDAQ') return '코스닥'
  return market ?? ''
}

export function formatPriceWon(value: number): string {
  return `${Math.round(value).toLocaleString('ko-KR')}원`
}

export function formatSignedAmount(value: number): string {
  const rounded = Math.round(value)
  const abs = Math.abs(rounded).toLocaleString('ko-KR')
  if (rounded > 0) return `+${abs}`
  if (rounded < 0) return `−${abs}`
  return '0'
}

export function formatGapPct(value: number): string {
  const rounded = Math.round(value * 10) / 10
  if (rounded > 0) return `+${rounded.toFixed(1)}%`
  if (rounded < 0) return `−${Math.abs(rounded).toFixed(1)}%`
  return '0.0%'
}
