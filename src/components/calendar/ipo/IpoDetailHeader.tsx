import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NoteBadge, Tag } from '@/components/calendar/detail/DetailParts'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { IpoDetailRes } from '@/lib/apiTypes'
import { IPO_STATUS_LABELS } from '@/lib/calendar'
import { PLANNED_PRICE_HINT, ipoHeaderCountdown, ipoPriceBadge, ipoPriceText, listedTicker } from '@/lib/ipoDetail'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface IpoDetailHeaderProps {
  detail: IpoDetailRes
  from: string
  today: string
  onNavigate: () => void
}

export function IpoDetailHeader({ detail, from, today, onNavigate }: IpoDetailHeaderProps) {
  const price = detail.offering.price
  const badge = ipoPriceBadge(price, detail.offering.priceBasis)
  const stockTicker = listedTicker(detail)
  const countdown = ipoHeaderCountdown(detail, today)

  return (
    <header className="flex flex-col gap-3 px-6 pt-7 pb-5 sm:px-8">
      <div className="flex flex-col gap-1 pr-8">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <DialogTitle className="min-w-0 break-keep text-title font-medium leading-tight tracking-[-0.5px] text-foreground">
            {detail.name}
          </DialogTitle>
          {detail.spac && <Tag>스팩</Tag>}
        </div>
        <DialogDescription className="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
          {detail.ticker && (
            <>
              <span className="font-mono tabular-nums">{detail.ticker}</span>
              <span aria-hidden className="h-3 w-px bg-border" />
            </>
          )}
          <span>공모주</span>
          <span aria-hidden className="h-3 w-px bg-border" />
          <span className="font-medium text-foreground-secondary">{IPO_STATUS_LABELS[detail.status]}</span>
        </DialogDescription>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-caption text-muted-foreground">공모가</span>
            <span
              className={cn(
                'text-lg font-medium text-foreground',
                price === null ? 'font-sans' : 'font-mono tabular-nums',
              )}
            >
              {ipoPriceText(price)}
            </span>
            {badge === '예정' && <NoteBadge>예정</NoteBadge>}
            {badge === '확정' && <Tag>확정</Tag>}
            {countdown && (
              <>
                <span aria-hidden className="h-3 w-px bg-border" />
                <span className="font-mono text-sm font-medium tabular-nums text-foreground">{countdown}</span>
              </>
            )}
          </p>
          {badge === '예정' && (
            <p className="text-caption text-muted-foreground break-keep">{PLANNED_PRICE_HINT}</p>
          )}
        </div>
        {stockTicker && (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/stock/${encodeURIComponent(stockTicker)}`} state={fromState(from)} onClick={onNavigate}>
              종목 상세 보기
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
        )}
      </div>
    </header>
  )
}
