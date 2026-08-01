/** 등락률 포맷: +5.25% / −0.10% (U+2212 마이너스), 소수 2자리 */
export function formatChange(value: number): string {
  if (value > 0) return `+${value.toFixed(2)}%`
  if (value < 0) return `−${Math.abs(value).toFixed(2)}%`
  return '0.00%'
}

export function formatPrice(value: number): string {
  return value.toLocaleString('ko-KR')
}

export function changeColorClass(value: number): string {
  if (value > 0) return 'text-stock-up'
  if (value < 0) return 'text-stock-down'
  return 'text-foreground'
}

/** 조 단위 금액 (예: 228.7조) */
export function formatTrillion(value: number | null): string {
  if (value === null) return '-'
  return `${value.toFixed(1)}조`
}

/** 시가총액: 조 단위 값을 억 단위 숫자로 (예: 195.5 → "1,955,000") */
export function formatMarketCapEok(trillion: number): string {
  return Math.round(trillion * 1e4).toLocaleString('ko-KR')
}

/** 거래대금: 원 단위 값을 백만 단위 숫자로 (예: 3,305,120,000 → "3,305") */
export function formatTradingValueMillion(won: number): string {
  return Math.round(won / 1e6).toLocaleString('ko-KR')
}

export function formatPercent(value: number | null, digits = 2): string {
  if (value === null) return '-'
  return `${value.toFixed(digits)}%`
}

export function formatWon(value: number | null): string {
  if (value === null) return '-'
  return `${value.toLocaleString('ko-KR')}원`
}

export function formatMultiple(value: number | null): string {
  if (value === null) return '-'
  return `${value.toFixed(2)}배`
}
