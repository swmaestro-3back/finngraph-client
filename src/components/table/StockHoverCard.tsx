import type { ReactNode } from 'react'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import {
  changeColorClass,
  formatChangeOrDash,
  formatCompactKrw,
  formatPriceOrDash,
} from '@/lib/format'
import { useStockIndex } from '@/lib/queries/useStocksCached'
import { cn } from '@/lib/utils'

interface StockHoverCardProps {
  ticker: string
  children: ReactNode
}

export function StockHoverCard({ ticker, children }: StockHoverCardProps) {
  const index = useStockIndex()
  const stock = index?.get(ticker)
  if (!stock) return <>{children}</>

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      {/* 트리거는 종종 행 전체 button 안에 놓인다 — asChild로 children(span)을 그대로 써서 중첩 버튼을 피한다 */}
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        align="start"
        className="w-64 rounded-xl border border-border bg-background p-4 shadow-soft ring-0"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-body font-semibold text-foreground">{stock.name}</span>
          <span className="font-mono text-caption text-foreground-tertiary">{stock.ticker}</span>
          <span className="ml-auto shrink-0 text-micro tracking-[0.4px] text-muted-foreground">
            {stock.market}
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-body font-semibold text-foreground">
            {formatPriceOrDash(stock.price)}
          </span>
          <span className={cn('font-mono text-caption', changeColorClass(stock.change ?? 0))}>
            {formatChangeOrDash(stock.change)}
          </span>
        </div>
        <div className="mt-3 grid gap-1.5 text-caption">
          <div className="flex justify-between">
            <span className="text-muted-foreground">1주</span>
            <span className={cn('font-mono', changeColorClass(stock.w1 ?? 0))}>
              {formatChangeOrDash(stock.w1)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">1개월</span>
            <span className={cn('font-mono', changeColorClass(stock.m1 ?? 0))}>
              {formatChangeOrDash(stock.m1)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">시가총액</span>
            <span className="font-mono text-foreground">{formatCompactKrw(stock.marketCap)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="shrink-0 text-muted-foreground">테마</span>
            <span className="truncate text-foreground">{stock.themeName ?? '—'}</span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
