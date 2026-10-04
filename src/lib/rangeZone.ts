/** 범위 안 위치(0~1)를 3등분한 구간 색 — 하위 초록, 중간 파랑, 상위 빨강 */
export interface RangeZone {
  /** 막대 채움 */
  fill: string
  /** 현재 위치 점 */
  dot: string
  /** 테두리 — 연한 채움과 짝을 이뤄 범례 원으로 쓴다 */
  stroke: string
}

export function rangeZone(position: number): RangeZone {
  if (position < 1 / 3)
    return {
      fill: 'bg-trend-positive/25',
      dot: 'bg-trend-positive',
      stroke: 'border-trend-positive',
    }
  if (position < 2 / 3)
    return { fill: 'bg-primary/25', dot: 'bg-primary', stroke: 'border-primary' }
  return { fill: 'bg-stock-up/25', dot: 'bg-stock-up', stroke: 'border-stock-up' }
}

/**
 * 순위 → 위치(0~1). 1위가 1, 꼴찌가 0 — 순위가 좋을수록 rangeZone의 상위 구간에 든다.
 * 비교 대상이 하나뿐이면 가운데(0.5).
 */
export function rankPosition(rank: number, total: number): number {
  if (total <= 1) return 0.5
  return 1 - (rank - 1) / (total - 1)
}
