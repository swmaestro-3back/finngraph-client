import { Link } from 'react-router-dom'
import { FavoriteStar } from '@/components/favorite/FavoriteStar'
import { Button } from '@/components/ui/button'
import type { StockDetailRes } from '@/lib/apiTypes'
import { changeColorClass, formatChangeOrDash, formatPriceOrDash } from '@/lib/format'
import { stockPriceBasisLabel } from '@/lib/referenceDate'
import { cn } from '@/lib/utils'

export function StockHeader({ stock }: { stock: StockDetailRes }) {
  const basis = stockPriceBasisLabel(stock)

  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h1 className="text-display font-normal leading-[1.1] tracking-[-0.8px] text-foreground">{stock.name}</h1>
          <FavoriteStar type="STOCK" targetKey={stock.ticker} label={stock.name} />
          <span className="font-mono text-body text-muted-foreground">
            {stock.ticker} · {stock.market}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-title font-medium tracking-[-0.5px] text-foreground">
            {formatPriceOrDash(stock.price)}
          </span>
          <span className={cn('font-mono text-base font-medium', changeColorClass(stock.change ?? 0))}>
            {formatChangeOrDash(stock.change)}
          </span>
          {basis && <span className="font-mono text-caption text-muted-foreground">{basis}</span>}
        </div>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link to={`/graph/${stock.ticker}`}>지식그래프에서 보기</Link>
      </Button>
    </header>
  )
}
