import { describe, expect, it } from 'vitest'
import type { CandleRes } from '@/lib/apiTypes'
import {
  bollinger,
  buildReturnChart,
  monthTicks,
  nearestDateIndex,
  niceTicks,
  spreadLabels,
} from '@/lib/leaderChart'

const candle = (date: string, close: number): CandleRes => ({
  date,
  open: close,
  high: close,
  low: close,
  close,
  volume: 0,
})

const a = [
  candle('2026-09-28', 100),
  candle('2026-09-29', 110),
  candle('2026-09-30', 120),
  candle('2026-10-01', 90),
]

describe('buildReturnChart', () => {
  it('마지막 limit개만 쓰고 구간 첫 종가를 0%로 잡는다', () => {
    const chart = buildReturnChart([a], 3)
    expect(chart?.dates).toEqual(['2026-09-29', '2026-09-30', '2026-10-01'])
    expect(chart?.series[0]?.points.map((p) => p.index)).toEqual([0, 1, 2])
    expect(chart?.series[0]?.points[0].pct).toBe(0)
    expect(chart?.series[0]?.points[1].pct).toBeCloseTo(9.0909, 3)
    expect(chart?.series[0]?.periodReturn).toBeCloseTo(-18.1818, 3)
  })

  it('세로축 범위는 모든 종목을 합쳐 잡는다', () => {
    const b = [candle('2026-09-30', 50), candle('2026-10-01', 100)]
    const chart = buildReturnChart([a, b], 4)
    expect(chart?.min).toBe(-10)
    expect(chart?.max).toBe(100)
  })

  it('거래일이 빠진 종목은 날짜 기준으로 제자리에 놓는다', () => {
    const b = [candle('2026-09-30', 50), candle('2026-10-01', 100)]
    const chart = buildReturnChart([a, b], 4)
    expect(chart?.dates).toHaveLength(4)
    expect(chart?.series[1]?.points.map((p) => p.index)).toEqual([2, 3])
  })

  it('시세가 두 개 미만인 종목은 null, 전부 없으면 차트도 null', () => {
    const chart = buildReturnChart([a, null, [candle('2026-10-01', 10)]], 4)
    expect(chart?.series[1]).toBeNull()
    expect(chart?.series[2]).toBeNull()
    expect(buildReturnChart([null, []], 4)).toBeNull()
  })
})

describe('nearestDateIndex', () => {
  it('가로 비율을 가장 가까운 날짜 칸으로 바꾸고 범위를 벗어나지 않는다', () => {
    expect(nearestDateIndex(0, 5)).toBe(0)
    expect(nearestDateIndex(0.49, 5)).toBe(2)
    expect(nearestDateIndex(1, 5)).toBe(4)
    expect(nearestDateIndex(-0.3, 5)).toBe(0)
    expect(nearestDateIndex(1.4, 5)).toBe(4)
  })
})

describe('bollinger', () => {
  it('창이 차기 전에는 값이 없고, 찬 뒤로는 평균 ± k·표준편차', () => {
    const bands = bollinger([1, 3, 1, 3], 2, 2)
    expect(bands[0]).toBeNull()
    // 창 [1, 3] — 평균 2, 모표준편차 1
    expect(bands[1]).toEqual({ upper: 4, lower: 0 })
    expect(bands[3]).toEqual({ upper: 4, lower: 0 })
  })

  it('값이 변하지 않으면 밴드 폭이 0이다', () => {
    expect(bollinger([5, 5, 5], 3, 2)[2]).toEqual({ upper: 5, lower: 5 })
  })
})

describe('buildReturnChart 밴드와 평균', () => {
  // 구간(마지막 3개) 앞에 준비 구간 2개가 붙은 시세
  const x = [100, 100, 100, 110, 120].map((close, i) => candle(`2026-09-2${i + 1}`, close))
  const y = [200, 200, 200, 180, 160].map((close, i) => candle(`2026-09-2${i + 1}`, close))

  it('밴드는 구간 앞 시세까지 써서 구간 첫날부터 그린다', () => {
    const chart = buildReturnChart([x], 3, { window: 3, k: 2 })
    const band = chart?.series[0]?.band
    expect(band?.map((b) => b.index)).toEqual([0, 1, 2])
    // 첫날 창 [100, 100, 100] — 폭 0, 구간 첫 종가 대비 0%
    expect(band?.[0]).toEqual({ index: 0, upper: 0, lower: 0 })
    expect(band?.[2].upper).toBeGreaterThan(20)
  })

  it('준비 구간이 모자라면 밴드는 창이 찬 날부터 시작한다', () => {
    const chart = buildReturnChart([x.slice(2)], 3, { window: 3, k: 2 })
    expect(chart?.series[0]?.band.map((b) => b.index)).toEqual([2])
  })

  it('평균 선은 종목 수익률의 단순 평균이다', () => {
    const chart = buildReturnChart([x, y], 3, { window: 3, k: 2 })
    // x는 0·+10·+20%, y는 0·−10·−20% — 평균은 내내 0%
    chart?.average?.points.forEach((p) => expect(p.pct).toBeCloseTo(0, 6))
    expect(chart?.average?.points).toHaveLength(3)
    expect(chart?.average?.periodReturn).toBeCloseTo(0, 6)
    expect(chart?.average?.band.map((b) => b.index)).toEqual([0, 1, 2])
  })

  it('종목이 하나뿐이면 평균 선을 만들지 않는다', () => {
    expect(buildReturnChart([x, null], 3)?.average).toBeNull()
  })

  it('평균 밴드까지 담는 세로 범위를 따로 준다', () => {
    const steady = [100, 100, 100, 100, 100].map((close, i) => candle(`2026-09-2${i + 1}`, close))
    const chart = buildReturnChart([x, steady], 3, { window: 3, k: 2 })
    // 선은 0~+20%, 평균(0·+5·+10%)의 밴드는 +10% 위로 더 벌어진다
    expect(chart?.max).toBeCloseTo(20, 6)
    expect(chart?.bandMax).toBeGreaterThanOrEqual(chart?.max ?? 0)
    expect(chart?.bandMin).toBeLessThan(0)
  })
})

describe('주가 환산용 값', () => {
  it('종목 선은 구간 첫 종가와 날짜별 종가를 함께 준다', () => {
    const chart = buildReturnChart([a], 3)
    expect(chart?.series[0]?.base).toBe(110)
    expect(chart?.series[0]?.points.map((p) => p.close)).toEqual([110, 120, 90])
  })
})

describe('niceTicks', () => {
  it('범위 안에서 1·2·5 단위로 떨어지는 눈금을 개수 한도 안에서 가장 촘촘하게 고른다', () => {
    expect(niceTicks(-21, 32)).toEqual([-20, -10, 0, 10, 20, 30])
    expect(niceTicks(-3.2, 4.1)).toEqual([-2, 0, 2, 4])
    expect(niceTicks(0, 100)).toEqual([0, 20, 40, 60, 80, 100])
    expect(niceTicks(-35, 95)).toEqual([-20, 0, 20, 40, 60, 80])
    expect(niceTicks(-35, 95, 3)).toEqual([0, 50])
    expect(niceTicks(-45, 95)).toEqual([-25, 0, 25, 50, 75])
  })

  it('범위가 0이어도 눈금을 하나는 준다', () => {
    expect(niceTicks(0, 0)).toEqual([0])
  })
})

describe('monthTicks', () => {
  it('달이 바뀌는 첫 거래일에 눈금을 둔다', () => {
    expect(
      monthTicks(['2026-08-28', '2026-08-31', '2026-09-01', '2026-09-02', '2026-10-01']),
    ).toEqual([
      { index: 2, label: '9월' },
      { index: 4, label: '10월' },
    ])
  })
})

describe('spreadLabels', () => {
  it('충분히 떨어진 이름표는 그대로 둔다', () => {
    expect(spreadLabels([10, 50, 90], 8, 0, 100)).toEqual([10, 50, 90])
  })

  it('겹치는 이름표는 순서를 지키며 간격만큼 벌린다', () => {
    expect(spreadLabels([50, 52, 20], 8, 0, 100)).toEqual([50, 58, 20])
  })

  it('아래로 밀려 범위를 넘으면 위로 되민다', () => {
    expect(spreadLabels([95, 96, 97], 8, 0, 100)).toEqual([84, 92, 100])
  })
})
