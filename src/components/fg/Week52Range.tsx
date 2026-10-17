import { Badge } from '@/components/fg/Badge'
import { formatGapPct, formatPriceWon } from '@/lib/fg/format'
import { monthDayLabel } from '@/lib/fg/themeCharts'
import {
  gapFromHigh,
  WEEK52_BASIS_LABEL,
  week52GroupLabel,
  week52Position,
  week52RecordDay,
  week52ValueText,
  type Week52Basis,
  type Week52State,
} from '@/lib/fg/week52'
import { cn } from '@/lib/utils'

interface Week52RangeProps {
  name: string
  price: number
  high: number
  low: number
  basis: Week52Basis
  asOf?: string | null
  today?: string | null
  state?: Week52State
  variant?: 'full' | 'compact' | 'bar'
  highDate?: string | null
  lowDate?: string | null
  className?: string
}

export function Week52Range({
  name,
  price,
  high,
  low,
  basis,
  asOf = null,
  today = null,
  state = 'normal',
  variant = 'full',
  highDate = null,
  lowDate = null,
  className,
}: Week52RangeProps) {
  const position = week52Position({ price, high, low })
  const gap = formatGapPct(gapFromHigh(price, high))
  const stateClass = state === 'high' ? 'fg-w52--high' : state === 'low' ? 'fg-w52--low' : undefined
  const bar =
    position === null ? null : (
      <div
        className="fg-w52__bar"
        role="meter"
        aria-label="52주 범위 안 현재가 위치"
        aria-valuemin={low}
        aria-valuemax={high}
        aria-valuenow={Math.min(high, Math.max(low, price))}
        aria-valuetext={week52ValueText({ price, high, low })}
      >
        <span className="fg-w52__dot" style={{ left: `${(position * 100).toFixed(1)}%` }} />
      </div>
    )
  const groupProps = { role: 'group', 'aria-label': week52GroupLabel(name, basis, asOf) } as const
  const latest = asOf ?? ((highDate ?? '') > (lowDate ?? '') ? highDate : lowDate)
  const refYear = latest ? Number(latest.slice(0, 4)) : 0

  if (variant === 'bar') {
    return (
      <div className={cn('fg-w52 fg-w52--compact', stateClass, className)} {...groupProps}>
        {bar}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn('fg-w52 fg-w52--compact', stateClass, className)} {...groupProps}>
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
    <div className={cn('fg-w52', stateClass, className)} {...groupProps}>
      <div className="fg-w52__line">
        {state === 'high' && (
          <>
            <Badge tone="high">52주 신고가</Badge>
            <span>
              {week52RecordDay(asOf, today)} <b>{formatPriceWon(price)}</b>으로 경신
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
            <span>52주 범위 · {WEEK52_BASIS_LABEL[basis]}</span>
            <span className="fg-w52__gap">최고가 대비 {gap}</span>
          </>
        )}
      </div>
      {bar}
      <div className="fg-w52__ends">
        <span className="fg-w52__end">
          <span>
            최저 <b>{formatPriceWon(low)}</b>
          </span>
          {lowDate && <span>{monthDayLabel(lowDate, refYear)}</span>}
        </span>
        <span className="fg-w52__end">
          <span>
            최고 <b>{formatPriceWon(high)}</b>
          </span>
          {highDate && <span>{monthDayLabel(highDate, refYear)}</span>}
        </span>
      </div>
    </div>
  )
}
