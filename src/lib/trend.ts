// 재무 지표의 '연속 추세 구간' 계산 헬퍼

/** 지표 성격: 값이 오르는 게 좋은 지표 / 내리는 게 좋은 지표 */
export type MetricDirection = 'up-good' | 'down-good'

/** 셀에 칠할 추세 톤 — 연속 개선 / 연속 악화 */
export type TrendTone = 'improving' | 'worsening'

/** 최소 연속 횟수: 1회성 등락은 칠하지 않고 2회 이상 이어질 때만 강조 */
export const MIN_TREND_RUN = 2

/**
 * 값 배열을 훑어 같은 방향이 minRun회 이상 연속된 구간만 톤을 부여한다.
 *
 * - null(미공시)은 건너뛰고 직전 유효값과 비교한다.
 * - 변화가 발생한 셀에만 톤이 붙는다. 예) 100 → 120 → 150 (2연속 개선)이면 120·150 셀만 칠하고
 *   기준점인 100 셀은 칠하지 않는다.
 * - 보합(변화 없음)은 추세를 끊는다.
 *
 * @returns values와 같은 길이의 배열. 칠하지 않을 셀은 null.
 */
export function computeTrendTones(
  values: (number | null)[],
  direction: MetricDirection,
  minRun: number = MIN_TREND_RUN,
): (TrendTone | null)[] {
  const tones: (TrendTone | null)[] = values.map(() => null)

  // null을 제외한 유효 값 + 원본 인덱스
  const points: { value: number; index: number }[] = []
  values.forEach((value, index) => {
    if (value !== null) points.push({ value, index })
  })

  // 인접한 유효값 사이의 방향 (steps[i]는 points[i] → points[i + 1] 구간)
  const steps: (TrendTone | null)[] = []
  for (let i = 1; i < points.length; i++) {
    const diff = points[i].value - points[i - 1].value
    if (diff === 0) {
      steps.push(null)
      continue
    }
    const improving = diff > 0 === (direction === 'up-good')
    steps.push(improving ? 'improving' : 'worsening')
  }

  // 같은 톤이 minRun회 이상 이어진 구간만 칠한다
  let start = 0
  while (start < steps.length) {
    const tone = steps[start]
    if (tone === null) {
      start += 1
      continue
    }
    let end = start
    while (end + 1 < steps.length && steps[end + 1] === tone) end += 1

    if (end - start + 1 >= minRun) {
      for (let step = start; step <= end; step++) {
        tones[points[step + 1].index] = tone
      }
    }
    start = end + 1
  }

  return tones
}
