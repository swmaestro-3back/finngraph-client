import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { InvestorFlowRes } from '@/lib/apiTypes'
import { calcSupplyStreaks, type SupplyStreak } from '@/lib/supplyStreak'
import { cn } from '@/lib/utils'

const DIRECTION_LABEL = { buy: '순매수', sell: '순매도' } as const

function streakBadge(subject: string, streak: SupplyStreak): ReactNode {
  if (streak.days < 3 || streak.direction === null) return null
  return (
    <Badge
      key={subject}
      variant="secondary"
      className={streak.direction === 'buy' ? 'text-stock-up' : 'text-stock-down'}
    >
      {subject} {streak.days}일 연속 {DIRECTION_LABEL[streak.direction]}
    </Badge>
  )
}

export function supplyStreakBadges(flows: InvestorFlowRes[]): ReactNode[] {
  if (flows.length === 0) return []

  const { foreign, institution } = calcSupplyStreaks(flows)
  const badges: ReactNode[] = []
  if (foreign.direction === 'buy' && foreign.days >= 3 && institution.direction === 'buy' && institution.days >= 3) {
    badges.push(
      <Badge key="double-buy" variant="secondary" className="font-semibold text-stock-up">
        쌍끌이 매수
      </Badge>,
    )
  }
  const foreignBadge = streakBadge('외국인', foreign)
  if (foreignBadge) badges.push(foreignBadge)
  const institutionBadge = streakBadge('기관', institution)
  if (institutionBadge) badges.push(institutionBadge)
  return badges
}

export function SupplyStreakBadges({ flows, className }: { flows: InvestorFlowRes[]; className?: string }) {
  const badges = supplyStreakBadges(flows)
  if (badges.length === 0) return null
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>{badges}</div>
}
