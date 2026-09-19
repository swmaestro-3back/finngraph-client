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

/**
 * 연간 축 라벨 간격 — 슬롯이 목표 라벨 수 이하면 전부 표시(0),
 * 넘으면 라벨이 목표 수 안팎만 남도록 건너뛸 칸 수를 돌려준다 (recharts XAxis interval).
 */
export function annualTickInterval(count: number, maxLabels = 12): number {
  if (count <= maxLabels) return 0
  return Math.ceil(count / maxLabels) - 1
}

/** 이슈 막대의 최소 높이(px) — 1건도 "있다"는 것은 보여야 한다 */
export const ISSUE_BAR_MIN_PX = 2

/**
 * 이슈 막대 높이 비율(0~1) — 제곱근 척도.
 * 건수는 한 칸에 수십 건이 몰리는 꼬리가 길어서, 선형이면 2건이 77건 옆에서 1px도 못 된다.
 * 제곱근은 순서를 지키면서 작은 값을 끌어올린다 (2/77 → 0.16, 10/77 → 0.36).
 */
export function issueBarRatio(count: number, maxSide: number): number {
  if (count <= 0 || maxSide <= 0) return 0
  return Math.sqrt(Math.min(1, count / maxSide))
}

/**
 * 이슈 막대 CSS height — 레인 절반(50%)에 비율을 곱하고, 0선과 겹치지 않게 0.5px를 뺀 뒤
 * 최소 높이를 보장한다. 최대값은 그대로 절반을 채운다.
 */
export function issueBarHeight(count: number, maxSide: number): string {
  const pct = issueBarRatio(count, maxSide) * 50
  return `max(${ISSUE_BAR_MIN_PX}px, calc(${pct}% - 0.5px))`
}
