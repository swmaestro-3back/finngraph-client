import { StockLogo } from '@/components/stock/StockLogo'
import { StockHoverCard } from '@/components/table/StockHoverCard'
import type { Market } from '@/lib/apiTypes'
import { cn } from '@/lib/utils'

interface StockIdentityProps {
  name: string
  code: string
  market: Market
  className?: string
}

/** 종목 표의 이름 칸 — 로고 · 종목명 · 코드 · 시장을 한 줄로 */
export function StockIdentity({ name, code, market, className }: StockIdentityProps) {
  return (
    <StockHoverCard ticker={code}>
      <span className={cn('flex min-w-0 items-center gap-2', className)}>
        <StockLogo ticker={code} size={24} reserveSpace />
        <span className="truncate text-sm font-semibold leading-tight text-foreground">{name}</span>
        <span className="shrink-0 font-mono text-caption leading-none text-foreground-tertiary">
          {code}
        </span>
        <span
          className={cn(
            'shrink-0 rounded px-1.5 py-0.5 text-micro leading-none tracking-[0.4px] text-muted-foreground',
            market === 'KOSPI' ? 'bg-surface-inset' : 'bg-muted',
          )}
        >
          {market}
        </span>
      </span>
    </StockHoverCard>
  )
}
