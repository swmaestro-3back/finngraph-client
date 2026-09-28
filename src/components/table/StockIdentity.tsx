import { StockHoverCard } from '@/components/table/StockHoverCard'
import type { Market } from '@/lib/apiTypes'
import { cn } from '@/lib/utils'

interface StockIdentityProps {
  name: string
  code: string
  market: Market
  className?: string
}

export function StockIdentity({ name, code, market, className }: StockIdentityProps) {
  return (
    <StockHoverCard ticker={code}>
      <span className={cn('flex min-w-0 flex-col gap-0.5', className)}>
        <span className="text-sm font-semibold leading-tight whitespace-nowrap text-foreground">
          {name}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-caption leading-none text-foreground-tertiary">{code}</span>
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-micro leading-none tracking-[0.4px] text-muted-foreground',
              market === 'KOSPI' ? 'bg-surface-inset' : 'bg-muted',
            )}
          >
            {market}
          </span>
        </span>
      </span>
    </StockHoverCard>
  )
}
