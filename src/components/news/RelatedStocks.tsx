import { Link, useLocation } from 'react-router-dom'
import type { RelatedCompanyRes } from '@/lib/apiTypes'
import { changeColorClass, formatChangeOrDash, formatPriceOrDash } from '@/lib/format'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface Props {
  stocks: RelatedCompanyRes[]
  onNavigate: () => void
}

export function RelatedStocks({ stocks, onNavigate }: Props) {
  const { pathname } = useLocation()

  if (stocks.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {stocks.map((stock) =>
        stock.ticker === null ? (
          <span
            key={stock.companyName}
            className="flex items-center rounded-xl border border-border px-3 py-2"
          >
            <span className="text-body font-semibold text-foreground">
              {stock.companyName}
            </span>
          </span>
        ) : (
          <Link
            key={stock.ticker}
            to={`/stock/${stock.ticker}`}
            state={fromState(pathname)}
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2 hover:border-primary/40 hover:bg-surface-inset"
          >
            <span className="text-body font-semibold text-foreground">
              {stock.companyName}
            </span>
            <span className="font-mono text-body text-foreground">
              {formatPriceOrDash(stock.price)}
            </span>
            <span
              className={cn(
                'font-mono text-xs font-medium',
                changeColorClass(stock.change ?? 0),
              )}
            >
              {formatChangeOrDash(stock.change)}
            </span>
          </Link>
        ),
      )}
    </div>
  )
}
