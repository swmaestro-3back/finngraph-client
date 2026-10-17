import { describe, expect, it } from 'vitest'
import type { InvestorFlowRes } from '@/lib/apiTypes'
import { calcSupplyStreaks } from '@/lib/supplyStreak'

function flow(date: string, foreignNet: number | null, institutionNet: number | null, individualNet: number | null = null): InvestorFlowRes {
  return { date, foreignNet, institutionNet, individualNet, foreignRatio: null }
}

describe('calcSupplyStreaks', () => {
  it('최신일부터 같은 방향이 이어진 날을 세고, 개인도 센다', () => {
    const flows = [flow('2026-09-25', 3, -1, -2), flow('2026-09-28', 2, 4, -5), flow('2026-09-29', 1, 5, -1)]
    expect(calcSupplyStreaks(flows)).toEqual({
      foreign: { days: 3, direction: 'buy' },
      institution: { days: 2, direction: 'buy' },
      individual: { days: 3, direction: 'sell' },
    })
  })

  it('0이나 빈 값에서 끊긴다', () => {
    expect(calcSupplyStreaks([flow('2026-09-29', 0, null, 3)])).toEqual({
      foreign: { days: 0, direction: null },
      institution: { days: 0, direction: null },
      individual: { days: 1, direction: 'buy' },
    })
  })

  it('거래일 달력이 있으면 수급 기록이 빠진 거래일에서 끊는다', () => {
    const flows = [flow('2026-09-23', 4, 1), flow('2026-09-29', -2, 1)]
    const days = ['2026-09-22', '2026-09-23', '2026-09-28', '2026-09-29', '2026-09-30']
    expect(calcSupplyStreaks(flows, days).institution).toEqual({ days: 1, direction: 'buy' })
    expect(calcSupplyStreaks(flows).institution).toEqual({ days: 2, direction: 'buy' })
  })

  it('휴장일을 사이에 둔 거래일은 이어진 것으로 본다', () => {
    const flows = [flow('2026-09-23', 4, 1), flow('2026-09-28', 2, 1)]
    const days = ['2026-09-22', '2026-09-23', '2026-09-28', '2026-09-29']
    expect(calcSupplyStreaks(flows, days).foreign).toEqual({ days: 2, direction: 'buy' })
  })

  it('달력에 없는 날짜는 이어진 것으로 본다', () => {
    const flows = [flow('2026-09-29', 4, 1), flow('2026-09-30', 2, 1)]
    expect(calcSupplyStreaks(flows, ['2026-09-28', '2026-09-29']).foreign).toEqual({ days: 2, direction: 'buy' })
  })
})
