import { cn } from '@/lib/utils'

interface MarketStatusBadgeProps {
  /** 정규장이 열려 있는가 (lib/marketClock isKrxOpen) */
  open: boolean
  className?: string
}

/** 장 상태 표시등 — 장중이면 파스텔 빨강 불빛이 깜빡이고, 장마감이면 잉크색으로 꺼져 있다 */
export function MarketStatusBadge({ open, className }: MarketStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-caption leading-none font-medium',
        open ? 'bg-market-open-soft text-market-open-ink' : 'bg-surface-inset text-foreground',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'size-1.5 rounded-full',
          open ? 'market-blink bg-market-open' : 'bg-foreground/30',
        )}
      />
      {open ? '장중' : '장마감'}
    </span>
  )
}
