import { describe, expect, it } from 'vitest'
import { annualTickInterval, issueBarHeight, issueBarRatio, priceAtY, roundToTick } from '@/lib/chartAxis'

describe('annualTickInterval', () => {
  it('목표 라벨 수 이하면 전부 표시(0)', () => {
    expect(annualTickInterval(3)).toBe(0)
    expect(annualTickInterval(12)).toBe(0)
  })

  it('넘으면 라벨이 목표 수 안팎만 남도록 건너뛴다', () => {
    // 13~24개 → 한 칸 걸러 하나
    expect(annualTickInterval(13)).toBe(1)
    expect(annualTickInterval(22)).toBe(1)
    expect(annualTickInterval(24)).toBe(1)
    // 25~36개 → 두 칸 걸러 하나
    expect(annualTickInterval(25)).toBe(2)
  })

  it('목표 라벨 수를 바꿀 수 있다', () => {
    expect(annualTickInterval(14, 14)).toBe(0)
    expect(annualTickInterval(22, 6)).toBe(3)
  })
})

describe('issueBarRatio', () => {
  it('최대값은 1, 0건은 0', () => {
    expect(issueBarRatio(77, 77)).toBe(1)
    expect(issueBarRatio(0, 77)).toBe(0)
    expect(issueBarRatio(3, 0)).toBe(0)
  })

  it('제곱근 척도라 작은 값이 선형보다 크게 보이고 순서는 유지된다', () => {
    const two = issueBarRatio(2, 77)
    const ten = issueBarRatio(10, 77)
    expect(two).toBeCloseTo(Math.sqrt(2 / 77), 5)
    expect(two).toBeGreaterThan(2 / 77)
    expect(ten).toBeGreaterThan(two)
    expect(ten).toBeLessThan(1)
  })

  it('최대값을 넘는 값은 1로 막는다', () => {
    expect(issueBarRatio(100, 77)).toBe(1)
  })
})

describe('issueBarHeight', () => {
  it('최소 2px을 보장하고 최대값은 절반(50%)을 채운다', () => {
    expect(issueBarHeight(77, 77)).toBe('max(2px, calc(50% - 0.5px))')
    expect(issueBarHeight(1, 77)).toMatch(/^max\(2px, calc\(5\.\d+% - 0\.5px\)\)$/)
  })
})

describe('priceAtY', () => {
  it('맨 위는 최댓값, 맨 아래는 최솟값, 가운데는 중간값', () => {
    expect(priceAtY(0, 300, 180_000, 380_000)).toBe(380_000)
    expect(priceAtY(300, 300, 180_000, 380_000)).toBe(180_000)
    expect(priceAtY(150, 300, 180_000, 380_000)).toBe(280_000)
  })

  it('영역 밖 좌표는 범위 안으로 자른다', () => {
    expect(priceAtY(-10, 300, 100, 200)).toBe(200)
    expect(priceAtY(310, 300, 100, 200)).toBe(100)
  })

  it('높이가 0이면 최댓값', () => {
    expect(priceAtY(0, 0, 100, 200)).toBe(200)
  })
})

describe('roundToTick', () => {
  it('KRX 호가 단위 경계마다 단위가 바뀐다', () => {
    expect(roundToTick(1_999.4)).toBe(1_999)
    expect(roundToTick(2_002)).toBe(2_000)
    expect(roundToTick(4_998)).toBe(5_000)
    expect(roundToTick(5_004)).toBe(5_000)
    expect(roundToTick(19_996)).toBe(20_000)
    expect(roundToTick(20_024)).toBe(20_000)
    expect(roundToTick(49_976)).toBe(50_000)
    expect(roundToTick(50_049)).toBe(50_000)
    expect(roundToTick(199_951)).toBe(200_000)
    expect(roundToTick(200_249)).toBe(200_000)
    expect(roundToTick(301_044)).toBe(301_000)
    expect(roundToTick(499_751)).toBe(500_000)
    expect(roundToTick(500_499)).toBe(500_000)
    expect(roundToTick(1_776_620)).toBe(1_777_000)
  })

  it('0 이하는 0', () => {
    expect(roundToTick(0)).toBe(0)
    expect(roundToTick(-5)).toBe(0)
  })
})
