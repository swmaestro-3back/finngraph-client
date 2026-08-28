import type { Market } from '@/data/stockMeta'
import { cn } from '@/lib/utils'

interface StockIdentityProps {
  name: string
  code: string
  market: Market
  className?: string
}

export function StockIdentity({ name, code, market, className }: StockIdentityProps) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2 overflow-hidden', className)}>
      <span className="overflow-hidden text-sm font-semibold whitespace-nowrap text-ellipsis text-foreground">
        {name}
      </span>
      <span className="font-mono text-caption leading-[1.4] text-foreground-tertiary">{code}</span>
      <span
        className={cn(
          'shrink-0 rounded px-1.5 py-0.5 text-[9px] tracking-[0.4px] text-muted-foreground',
          market === 'KOSPI' ? 'bg-surface-inset' : 'bg-muted',
        )}
      >
        {market}
      </span>
    </span>
  )
}
