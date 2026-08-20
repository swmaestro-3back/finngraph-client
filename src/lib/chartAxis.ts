// 가격 캔들과 이슈 레인이 같은 x축 위에 놓이도록 공유하는 축 기하
// (docs/superpowers/specs/2026-08-14-issue-timeline-design.md)
//
// 두 차트가 각자 slot을 계산하면 반드시 어긋난다. 축을 쓰는 쪽은 전부 여기를 거친다.
// DOM 없이 계산되므로 매핑이 같은지 순수 함수로 확인할 수 있다 (lib/graphLayout.ts와 같은 이유).

/** 가격 라벨이 들어가는 오른쪽 여백 — 축을 공유하는 레인은 전부 이걸 달아야 정렬된다 */
export const AXIS_GUTTER = 'mr-16'

/** 상승·호재 / 하락·악재 — index.css 토큰과 1:1 동기화 (--stock-up / --stock-down) */
export const UP = '#cf202f'
export const DOWN = '#0052ff'

/** 크로스헤어·선택 룰 색 — --foreground-tertiary */
export const RULE = '#a8acb3'

/** 한 항목이 차지하는 폭(%) */
export function slotPct(count: number): number {
  return 100 / count
}

/** 슬롯 중앙(%) — 크로스헤어와 캔들 심지가 놓이는 자리 */
export function slotCenter(index: number, count: number): number {
  const slot = slotPct(count)
  return index * slot + slot / 2
}

/** 슬롯 안에서 막대가 차지하는 비율 — 좌우 18% 여백, 폭 64% */
export const BAR_INSET = 0.18
export const BAR_FILL = 0.64

/** 슬롯 안 막대의 왼쪽(%) — 컨테이너 기준 */
export function barLeft(index: number, count: number): number {
  const slot = slotPct(count)
  return index * slot + slot * BAR_INSET
}

/** 슬롯 안 막대의 폭(%) — 컨테이너 기준 */
export function barWidth(count: number): number {
  return slotPct(count) * BAR_FILL
}

/** 커서 x(px) → 항목 인덱스 */
export function indexFromX(x: number, width: number, count: number): number {
  return Math.min(count - 1, Math.max(0, Math.floor((x / width) * count)))
}

/**
 * 짚은 칸만 또렷하게, 나머지는 물러나게 — 캔들·거래량·이슈 레인이 공유하는 강조 규칙.
 * 쉬는 상태(base)와 물러난 상태(dim)는 레인마다 밀도가 달라 인자로 받는다.
 */
export function emphasis(
  index: number,
  activeIndex: number | null,
  base: number,
  dim: number,
): number {
  if (activeIndex === null) return base
  return activeIndex === index ? 1 : dim
}

/** 날짜 라벨을 놓는 가로 위치(%) */
export const DATE_TICK_POSITIONS = [0, 33, 66, 99] as const

/** 각 라벨 위치에 해당하는 항목 인덱스 */
export function dateTickIndexes(count: number): number[] {
  return DATE_TICK_POSITIONS.map((pos) => Math.round((pos / 100) * (count - 1)))
}
