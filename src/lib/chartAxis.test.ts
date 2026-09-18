import { describe, expect, it } from 'vitest'
import { annualTickInterval } from '@/lib/chartAxis'

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
