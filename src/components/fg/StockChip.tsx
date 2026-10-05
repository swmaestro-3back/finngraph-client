import { Link } from 'react-router-dom'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { ChangeText } from '@/components/fg/PriceChange'
import { stockPath } from '@/lib/fg/paths'
import { cn } from '@/lib/utils'

interface StockChipProps {
  ticker: string
  name: string
  change?: number | null
  kind?: 'direct' | 'inferred'
  withLogo?: boolean
  className?: string
  state?: unknown
}

export function StockChip({ ticker, name, change = null, kind = 'direct', withLogo = false, className, state }: StockChipProps) {
  return (
    <Link to={stockPath(ticker)} state={state} className={cn('fg-chip', kind === 'inferred' && 'fg-chip--inferred', className)}>
      {withLogo && <CompanyLogo name={name} size={24} />}
      {name}
      {change !== null && <ChangeText value={change} className="fg-chg" />}
    </Link>
  )
}

interface MoreChipProps {
  count: number
  to?: string
}

export function MoreChip({ count, to }: MoreChipProps) {
  if (to) {
    return (
      <Link to={to} className="fg-chip fg-chip--more">
        +{count}
      </Link>
    )
  }
  return <span className="fg-chip fg-chip--more">+{count}</span>
}
