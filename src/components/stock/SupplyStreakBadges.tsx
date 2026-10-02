import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { InvestorFlowRes } from '@/lib/apiTypes'
import { calcSupplyStreaks, type SupplyStreak } from '@/lib/supplyStreak'
import { cn } from '@/lib/utils'

const DIRECTION_LABEL = { buy: '순매수', sell: '순매도' } as const

// 뉴스 "분석" 뱃지와 같은 틀(각진 아웃라인 + 연한 채움) — 수급 신호가 종목 헤더에서 바로 읽히도록 기본(12px)보다 키운다
const BADGE_BASE = 'h-6 rounded-sm px-2.5 text-sm'
/** 색은 방향을 뜻한다 — 시세 색과 같이 매수는 빨강, 매도는 파랑 */
const TONE = {
  buy: 'border-stock-up/40 bg-stock-up/8 text-stock-up',
  sell: 'border-stock-down/40 bg-stock-down/8 text-stock-down',
  // 쌍끌이는 같은 빨강을 더 진하게 — 외국인·기관이 함께 사는 더 강한 신호
  doubleBuy: 'border-stock-up/70 bg-stock-up/15 font-semibold text-stock-up',
} as const

function streakBadge(subject: string, streak: SupplyStreak): ReactNode {
  if (streak.days < 3 || streak.direction === null) return null
  return (
    <Badge
      key={subject}
      variant="outline"
      className={cn(BADGE_BASE, TONE[streak.direction])}
    >
      {subject} {streak.days}일 연속 {DIRECTION_LABEL[streak.direction]}
    </Badge>
  )
}

// 상세 페이지가 이미 받은 수급 데이터(최대 기간)를 재사용한다 — 훅을 다시 부르면 같은 GET이 중복 발생
export function SupplyStreakBadges({ flows }: { flows: InvestorFlowRes[] }) {
  if (flows.length === 0) return null

  const { foreign, institution } = calcSupplyStreaks(flows)
  const badges: ReactNode[] = []
  if (foreign.direction === 'buy' && foreign.days >= 3 && institution.direction === 'buy' && institution.days >= 3) {
    badges.push(
      <Badge key="double-buy" variant="outline" className={cn(BADGE_BASE, TONE.doubleBuy)}>
        쌍끌이 매수
      </Badge>,
    )
  }
  const foreignBadge = streakBadge('외국인', foreign)
  if (foreignBadge) badges.push(foreignBadge)
  const institutionBadge = streakBadge('기관', institution)
  if (institutionBadge) badges.push(institutionBadge)

  if (badges.length === 0) return null
  return <div className="mb-4 flex flex-wrap items-center gap-2">{badges}</div>
}
