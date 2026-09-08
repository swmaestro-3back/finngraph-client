import type { InvestorFlowRes } from '@/lib/apiTypes'

export type StreakDirection = 'buy' | 'sell' | null

export interface SupplyStreak {
  days: number
  direction: StreakDirection
}

export interface SupplyStreaks {
  foreign: SupplyStreak
  institution: SupplyStreak
}

function streakOf(rows: InvestorFlowRes[], key: 'foreignNet' | 'institutionNet'): SupplyStreak {
  let days = 0
  let direction: StreakDirection = null
  for (let i = rows.length - 1; i >= 0; i--) {
    const net = rows[i][key]
    if (net === null || net === 0) break
    const dir: StreakDirection = net > 0 ? 'buy' : 'sell'
    if (direction === null) direction = dir
    else if (direction !== dir) break
    days++
  }
  return { days, direction }
}

/** 최신일부터 거슬러 올라가며 주체별 연속 순매수/순매도 일수를 센다 */
export function calcSupplyStreaks(flows: InvestorFlowRes[]): SupplyStreaks {
  // 서버 응답 정렬을 신뢰하지 않고 날짜 오름차순으로 정규화
  const rows = [...flows].sort((a, b) => a.date.localeCompare(b.date))
  return {
    foreign: streakOf(rows, 'foreignNet'),
    institution: streakOf(rows, 'institutionNet'),
  }
}
