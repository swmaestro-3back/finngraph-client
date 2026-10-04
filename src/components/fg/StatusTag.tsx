import { Badge } from '@/components/fg/Badge'
import { formatPriceWon } from '@/lib/fg/format'
import type { StockStatus } from '@/lib/fg/stockQuote'
import { changeStatusTag } from '@/lib/themeMetrics'
import { cn } from '@/lib/utils'

interface StatusTagProps {
  status: StockStatus
  className?: string
}

export function StatusTag({ status, className }: StatusTagProps) {
  const tag = changeStatusTag(status)
  if (!tag) return null
  return (
    <Badge title={tag.title} className={cn('fg-status', className)}>
      {tag.label}
    </Badge>
  )
}

interface PriceStatusProps {
  price: number
  status: StockStatus
  display?: boolean
  className?: string
}

export function PriceStatus({ price, status, display = false, className }: PriceStatusProps) {
  return (
    <span className={cn('fg-price', className)}>
      <span className={cn('fg-price__now', display && 'fg-price__now--display')}>{formatPriceWon(price)}</span>
      <StatusTag status={status} />
    </span>
  )
}
