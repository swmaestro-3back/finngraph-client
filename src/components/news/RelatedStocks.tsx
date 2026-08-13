import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { stockListRows } from '@/data/stockList'
import { changeColorClass, formatChange, formatPrice } from '@/lib/format'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface Props {
  /** 기사에 등장한 기업 엔티티 이름 */
  companyNames: string[]
  /** 종목으로 이동할 때 모달을 닫는다 */
  onNavigate: () => void
}

/**
 * 기사에 등장한 기업 중 상장 종목으로 잡히는 것만 시세와 함께 보여준다.
 * (해외 기업·비상장 계열사는 종목 목록에 없어 자연히 빠진다)
 */
export function RelatedStocks({ companyNames, onNavigate }: Props) {
  const { pathname } = useLocation()

  const stocks = useMemo(() => {
    const byName = new Map(stockListRows.map((row) => [row.name, row]))
    return companyNames.map((name) => byName.get(name)).filter((row) => row != null)
  }, [companyNames])

  if (stocks.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {stocks.map((stock) => (
        <Link
          key={stock.code}
          to={`/stock/${stock.code}`}
          state={fromState(pathname)}
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2 hover:border-primary/40 hover:bg-surface-inset"
        >
          <span className="text-[13px] font-semibold text-foreground">{stock.name}</span>
          <span className="font-mono text-[13px] text-foreground">{formatPrice(stock.price)}</span>
          <span className={cn('font-mono text-xs font-medium', changeColorClass(stock.change))}>
            {formatChange(stock.change)}
          </span>
        </Link>
      ))}
    </div>
  )
}
