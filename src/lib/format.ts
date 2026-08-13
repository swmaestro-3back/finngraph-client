/** 등락률 포맷: +5.25% / −0.10% (U+2212 마이너스), 소수 2자리 */
export function formatChange(value: number): string {
  if (value > 0) return `+${value.toFixed(2)}%`
  if (value < 0) return `−${Math.abs(value).toFixed(2)}%`
  return '0.00%'
}

/**
 * 콤마 구분 정수 금액 — 단위 환산이 끝난 값에 사용한다.
 * (시가총액은 억, 거래대금은 백만 단위로 `@/data/stockMeta`에서 이미 환산되어 넘어온다)
 */
export function formatAmount(value: number): string {
  return Math.round(value).toLocaleString('ko-KR')
}

/** 현재가(원) */
export function formatPrice(value: number): string {
  return formatAmount(value)
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

/** 상대 시각 — 하루 안이면 "3시간 전", 일주일 안이면 "5일 전", 그보다 오래면 "7월 22일" */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso)
  const minutes = Math.floor((Date.now() - then.getTime()) / 60000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}시간 전`
  if (minutes < 60 * 24 * 7) return `${Math.floor(minutes / (60 * 24))}일 전`
  return `${then.getMonth() + 1}월 ${then.getDate()}일`
}
