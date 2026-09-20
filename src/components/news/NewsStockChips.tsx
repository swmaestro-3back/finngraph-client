import { Link, useLocation } from 'react-router-dom'
import type { RelatedCompanyRes } from '@/lib/apiTypes'
import { changeColorClass, formatChangeOrDash } from '@/lib/format'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface Props {
  stocks: RelatedCompanyRes[]
  onNavigate: () => void
}

const CHIP =
  'inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-inset px-3 text-sm font-medium text-foreground'

/** 기사 상단의 종목 알약 칩 — 종목명 + 등락률만. 본문을 읽기 전에 어떤 종목 얘기인지 알려준다 */
export function NewsStockChips({ stocks, onNavigate }: Props) {
  const { pathname } = useLocation()
  if (stocks.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {stocks.map((stock) => {
        const change = (
          <span className={cn('font-mono text-xs', changeColorClass(stock.change ?? 0))}>
            {formatChangeOrDash(stock.change)}
          </span>
        )
        if (stock.ticker === null) {
          return (
            <span key={stock.companyName} className={CHIP}>
              {stock.companyName}
              {change}
            </span>
          )
        }
        return (
          <Link
            key={stock.ticker}
            to={`/stock/${stock.ticker}`}
            state={fromState(pathname)}
            onClick={onNavigate}
            className={cn(CHIP, 'transition-colors hover:bg-accent')}
          >
            {stock.companyName}
            {change}
          </Link>
        )
      })}
    </div>
  )
}
