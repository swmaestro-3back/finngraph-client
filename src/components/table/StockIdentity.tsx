import type { Market } from '@/data/stockMeta'
import { cn } from '@/lib/utils'

// 종목 식별 셀 (종목명 · 코드 · 시장 라벨) — 주식 목록 / 테마 상세 관련 종목이 공유
// 종목명 + 코드 + 시장 라벨 한 줄
interface StockIdentityProps {
  name: string
  code: string
  market: Market
  className?: string
}

export function StockIdentity({ name, code, market, className }: StockIdentityProps) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2 overflow-hidden', className)}>
      <span className="overflow-hidden text-[13px] whitespace-nowrap text-ellipsis text-foreground">
        {name}
      </span>
      <span className="font-mono text-[10px] leading-[1.4] text-[#a8acb3]">{code}</span>
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
