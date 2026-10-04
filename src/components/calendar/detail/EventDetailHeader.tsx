import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FavoriteStar } from '@/components/favorite/FavoriteStar'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { StockCalendarRes } from '@/lib/apiTypes'
import { changeColorClass, formatChange, formatPrice } from '@/lib/format'
import { fromState } from '@/lib/navigation'
import { formatMonthDay } from '@/lib/themeMetrics'
import { cn } from '@/lib/utils'

type HeaderStock = Pick<StockCalendarRes, 'ticker' | 'stockName' | 'market' | 'price' | 'change' | 'priceDate'>

interface EventDetailHeaderProps {
  stock: HeaderStock
  description: string
  from: string
  onNavigate: () => void
}

export function EventDetailHeader({ stock, description, from, onNavigate }: EventDetailHeaderProps) {
  return (
    <header className="flex flex-col gap-3 px-6 pt-7 pb-5 sm:px-8">
      <div className="flex flex-col gap-1 pr-8">
        <div className="flex min-w-0 items-center gap-1">
          <DialogTitle className="min-w-0 truncate text-title font-medium leading-tight tracking-[-0.5px] text-foreground">
            {stock.stockName}
          </DialogTitle>
          <FavoriteStar type="STOCK" targetKey={stock.ticker} label={stock.stockName} size="sm" />
        </div>
        <DialogDescription className="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
          <span className="font-mono tabular-nums">{stock.ticker}</span>
          <span aria-hidden className="h-3 w-px bg-border" />
          <span>{stock.market}</span>
          <span aria-hidden className="h-3 w-px bg-border" />
          <span>{description}</span>
        </DialogDescription>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-lg font-medium tabular-nums text-foreground">
            {stock.price === null ? '—' : `${formatPrice(stock.price)}원`}
          </span>
          {stock.change !== null && (
            <span className={cn('font-mono text-sm font-medium tabular-nums', changeColorClass(stock.change))}>
              {formatChange(stock.change)}
            </span>
          )}
          {stock.priceDate && (
            <span className="font-mono text-caption tabular-nums text-muted-foreground">
              {formatMonthDay(stock.priceDate)} 기준
            </span>
          )}
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/stock/${encodeURIComponent(stock.ticker)}`} state={fromState(from)} onClick={onNavigate}>
            종목 상세 보기
            <ArrowUpRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </header>
  )
}
