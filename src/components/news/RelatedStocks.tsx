import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { changeColorClass, formatChangeOrDash, formatPriceOrDash } from '@/lib/format'
import { fromState } from '@/lib/navigation'
import { useStocks } from '@/lib/queries/useStocks'
import { cn } from '@/lib/utils'

interface Props {
  companyNames: string[]
  onNavigate: () => void
}

export function RelatedStocks({ companyNames, onNavigate }: Props) {
  const { pathname } = useLocation()
  const { data: rows } = useStocks()

  const stocks = useMemo(() => {
    const byName = new Map((rows ?? []).map((row) => [row.name, row]))
    return companyNames.map((name) => byName.get(name)).filter((row) => row != null)
  }, [companyNames, rows])

  if (stocks.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {stocks.map((stock) => (
        <Link
          key={stock.ticker}
          to={`/stock/${stock.ticker}`}
          state={fromState(pathname)}
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2 hover:border-primary/40 hover:bg-surface-inset"
        >
          <span className="text-body font-semibold text-foreground">{stock.name}</span>
          <span className="font-mono text-body text-foreground">
            {formatPriceOrDash(stock.price)}
          </span>
          <span
            className={cn('font-mono text-xs font-medium', changeColorClass(stock.change ?? 0))}
          >
            {formatChangeOrDash(stock.change)}
          </span>
        </Link>
      ))}
    </div>
  )
}
