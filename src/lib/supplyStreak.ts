import type { InvestorFlowRes } from '@/lib/apiTypes'

type StreakDirection = 'buy' | 'sell' | null

type NetKey = 'foreignNet' | 'institutionNet' | 'individualNet'

export interface SupplyStreak {
  days: number
  direction: StreakDirection
}

export interface SupplyStreaks {
  foreign: SupplyStreak
  institution: SupplyStreak
  individual: SupplyStreak
}

type Adjacent = (earlier: string, later: string) => boolean

function adjacentOn(tradingDays: readonly string[] | undefined): Adjacent {
  if (!tradingDays) return () => true
  const index = new Map(tradingDays.map((day, i) => [day, i]))
  return (earlier, later) => {
    const a = index.get(earlier)
    const b = index.get(later)
    return a === undefined || b === undefined || b - a <= 1
  }
}

function streakOf(rows: InvestorFlowRes[], key: NetKey, adjacent: Adjacent): SupplyStreak {
  let days = 0
  let direction: StreakDirection = null
  for (let i = rows.length - 1; i >= 0; i--) {
    const net = rows[i][key]
    if (net === null || net === 0) break
    if (i < rows.length - 1 && !adjacent(rows[i].date, rows[i + 1].date)) break
    const dir: StreakDirection = net > 0 ? 'buy' : 'sell'
    if (direction === null) direction = dir
    else if (direction !== dir) break
    days++
  }
  return { days, direction }
}

/** 최신일부터 거슬러 올라가며 주체별 연속 순매수/순매도 일수를 센다 */
export function calcSupplyStreaks(flows: InvestorFlowRes[], tradingDays?: readonly string[]): SupplyStreaks {
  // 서버 응답 정렬을 신뢰하지 않고 날짜 오름차순으로 정규화
  const rows = [...flows].sort((a, b) => a.date.localeCompare(b.date))
  const adjacent = adjacentOn(tradingDays)
  return {
    foreign: streakOf(rows, 'foreignNet', adjacent),
    institution: streakOf(rows, 'institutionNet', adjacent),
    individual: streakOf(rows, 'individualNet', adjacent),
  }
}
