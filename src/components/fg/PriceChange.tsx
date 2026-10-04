import { formatChange } from '@/lib/format'
import { formatPriceWon, formatSignedAmount, toneClass, toneOf } from '@/lib/fg/format'
import { cn } from '@/lib/utils'

interface ChangeTextProps {
  value: number
  className?: string
}

export function ChangeText({ value, className }: ChangeTextProps) {
  return <span className={cn('fg-num', toneClass(value), className)}>{formatChange(value)}</span>
}

interface PriceChangeProps {
  price: number
  change: number
  amount?: number | null
  display?: boolean
  basis?: string | null
  className?: string
}

export function PriceChange({ price, change, amount = null, display = false, basis = null, className }: PriceChangeProps) {
  const changeText =
    amount === null ? formatChange(change) : `${formatSignedAmount(amount)}원 (${formatChange(change)})`
  return (
    <span className={cn('fg-price', className)}>
      <span className={cn('fg-price__now', display && 'fg-price__now--display')}>{formatPriceWon(price)}</span>
      <span className={cn('fg-price__chg', toneClass(change))}>{changeText}</span>
      {basis && <span className="fg-caption">{basis}</span>}
    </span>
  )
}

export function ChangeBadge({ value }: { value: number }) {
  const tone = toneOf(value)
  const arrow = tone === 'up' ? '▲ ' : tone === 'down' ? '▼ ' : ''
  return (
    <span className={cn('fg-badge fg-num', tone !== 'flat' && `fg-badge--${tone}`)}>
      {`${arrow}${Math.abs(value).toFixed(2)}%`}
    </span>
  )
}
