import { formatLocalDate, formatLocalTime, isKrxOpen, useNow } from '@/lib/marketClock'
import { cn } from '@/lib/utils'

/** 장중/장마감 뱃지 + 브라우저 로컬 현재 시각 */
export function MarketClock() {
  const now = useNow()
  const open = isKrxOpen(now)
  return (
    <div className="flex items-center gap-[9px]">
      <span
        className={cn(
          'flex h-7 items-center rounded-md px-2.5 text-xs font-semibold whitespace-nowrap',
          open ? 'bg-stock-up-soft text-stock-up' : 'bg-muted text-muted-foreground',
        )}
      >
        {open ? '장중' : '장마감'}
      </span>
      <time
        dateTime={now.toISOString()}
        className="font-mono text-base font-medium tracking-[-0.4px] whitespace-nowrap text-foreground tabular-nums"
      >
        {formatLocalDate(now)} {formatLocalTime(now)}
      </time>
    </div>
  )
}
