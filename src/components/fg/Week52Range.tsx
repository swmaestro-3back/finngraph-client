import { Badge } from '@/components/fg/Badge'
import { formatGapPct, formatPriceWon } from '@/lib/fg/format'
import { gapFromHigh, week52Position, type Week52State } from '@/lib/fg/week52'
import { cn } from '@/lib/utils'

interface Week52RangeProps {
  name: string
  price: number
  high: number
  low: number
  state?: Week52State
  variant?: 'full' | 'compact' | 'bar'
  className?: string
}

export function Week52Range({ name, price, high, low, state = 'normal', variant = 'full', className }: Week52RangeProps) {
  const position = week52Position({ price, high, low })
  const gap = formatGapPct(gapFromHigh(price, high))
  const stateClass = state === 'high' ? 'fg-w52--high' : state === 'low' ? 'fg-w52--low' : undefined
  const bar =
    position === null ? null : (
      <div className="fg-w52__bar">
        <span className="fg-w52__dot" style={{ left: `${(position * 100).toFixed(1)}%` }} />
      </div>
    )
  const label = `${name} 52주 범위`

  if (variant === 'bar') {
    return (
      <div className={cn('fg-w52 fg-w52--compact', stateClass, className)} aria-label={label}>
        {bar}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn('fg-w52 fg-w52--compact', stateClass, className)} aria-label={label}>
        <div className="fg-w52__line">
          {state === 'high' && <Badge tone="high">52주 신고가</Badge>}
          {state === 'low' && <Badge tone="low">52주 신저가</Badge>}
          <span>
            52주 최고 <b>{formatPriceWon(high)}</b>
          </span>
          <span className="fg-w52__gap">최고가 대비 {gap}</span>
        </div>
        {bar}
      </div>
    )
  }

  return (
    <div className={cn('fg-w52', stateClass, className)} aria-label={label}>
      <div className="fg-w52__line">
        {state === 'high' && (
          <>
            <Badge tone="high">52주 신고가</Badge>
            <span>
              오늘 <b>{formatPriceWon(price)}</b>으로 경신
            </span>
          </>
        )}
        {state === 'low' && (
          <>
            <Badge tone="low">52주 신저가</Badge>
            <span className="fg-w52__gap">최고가 대비 {gap}</span>
          </>
        )}
        {state === 'normal' && (
          <>
            <span>52주 범위</span>
            <span className="fg-w52__gap">최고가 대비 {gap}</span>
          </>
        )}
      </div>
      {bar}
      <div className="fg-w52__ends">
        <span>
          최저 <b>{formatPriceWon(low)}</b>
        </span>
        <span>
          최고 <b>{formatPriceWon(high)}</b>
        </span>
      </div>
    </div>
  )
}
