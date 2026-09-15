import { useLocation, useNavigate } from 'react-router-dom'
import { ThemeBadge } from '@/components/theme/ThemeBadge'
import type { StockRowRes } from '@/lib/apiTypes'
import { changeColorClass, formatChangeOrDash } from '@/lib/format'
import { fromState } from '@/lib/navigation'
import { useStockNewsCached } from '@/lib/queries/useStockNewsCached'
import { cn } from '@/lib/utils'

interface MoverCardProps {
  stock: StockRowRes
}

function MoverCard({ stock }: MoverCardProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { data: news } = useStockNewsCached(stock.ticker)

  const reason = news?.[0]?.title ?? null

  return (
    <button
      type="button"
      onClick={() => navigate(`/stock/${stock.ticker}`, { state: fromState(pathname) })}
      aria-label={`${stock.name} ${formatChangeOrDash(stock.change)} 종목 상세 보기`}
      className="card-surface flex cursor-pointer flex-col gap-1.5 p-4 text-left hover:bg-muted"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate text-body font-semibold text-foreground">{stock.name}</span>
          <span className="shrink-0 text-caption text-muted-foreground">{stock.market}</span>
        </span>
        <span
          className={cn(
            'shrink-0 font-mono text-body font-semibold',
            changeColorClass(stock.change ?? 0),
          )}
        >
          {formatChangeOrDash(stock.change)}
        </span>
      </div>
      {stock.themeId !== null && stock.themeName && (
        <div className="flex">
          <ThemeBadge id={stock.themeId} name={stock.themeName} />
        </div>
      )}
      {reason && (
        <p className="line-clamp-1 text-caption text-muted-foreground">{reason}</p>
      )}
    </button>
  )
}

interface MoverFeedProps {
  movers: StockRowRes[]
}

export function MoverFeed({ movers }: MoverFeedProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {movers.map((stock) => (
        <MoverCard key={stock.ticker} stock={stock} />
      ))}
    </div>
  )
}
