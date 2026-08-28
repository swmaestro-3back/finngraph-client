import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getMarketCap, getTradingValue } from '@/data/stockMeta'
import type { ThemeItem } from '@/data/themes'
import { changeColorClass, formatAmount, formatChange, formatPrice } from '@/lib/format'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

const GRID =
  'grid gap-2 grid-cols-[minmax(0,1fr)_76px_78px_78px_62px] xl:gap-3 xl:grid-cols-[minmax(0,1fr)_80px_84px_84px_64px]'

interface StockSectionProps {
  theme: ThemeItem
  className?: string
  listClassName?: string
}

export function StockSection({ theme, className, listClassName }: StockSectionProps) {
  const { pathname } = useLocation()

  const stocks = useMemo(
    () =>
      [...theme.stocks]
        .sort((a, b) => b.change - a.change)
        .map((stock) => ({
          ...stock,
          marketCap: getMarketCap(stock.code, stock.price),
          tradingValue: getTradingValue(stock.name, stock.price),
        })),
    [theme],
  )

  return (
    <section className={cn('card-surface p-5', className)}>
      <div className="mb-[9px] flex min-h-[30px] items-center justify-between">
        <div className="flex items-baseline gap-[9px]">
          <h2 className="text-lg font-medium tracking-[-0.5px] text-foreground">
            {theme.name}
          </h2>
          <span
            className={cn(
              'font-mono text-base font-medium tracking-[-0.5px]',
              changeColorClass(theme.change),
            )}
          >
            {formatChange(theme.change)}
          </span>
        </div>
        <Link
          to={`/theme/${theme.id}`}
          state={fromState(pathname)}
          className="text-xs font-semibold leading-none text-primary"
        >
          테마 상세 →
        </Link>
      </div>

      <div className={cn(GRID, 'border-b border-border pb-1.5 text-caption text-muted-foreground')}>
        <span className="truncate">종목명 · {stocks.length}개 종목</span>
        <span className="whitespace-nowrap text-right">현재가</span>
        <span className="whitespace-nowrap text-right">시가총액(억)</span>
        <span className="whitespace-nowrap text-right">거래대금(백만)</span>
        <span className="whitespace-nowrap text-right">등락률</span>
      </div>

      <div className={cn(listClassName)}>
        {stocks.map((stock) => (
          <Link
            key={stock.code}
            to={`/stock/${stock.code}`}
            state={fromState(pathname)}
            className={cn(
              GRID,
              'min-h-[38px] items-center border-b border-surface-inset py-1 hover:bg-muted',
            )}
          >
            <span className="flex items-center gap-[9px] overflow-hidden">
              <span className="truncate text-sm font-semibold text-foreground">
                {stock.name}
              </span>
              <span className="hidden font-mono text-caption text-foreground-tertiary xl:inline">
                {stock.code}
              </span>
            </span>
            <span className="text-right font-mono text-sm font-medium text-foreground">
              {formatPrice(stock.price)}
            </span>
            <span className="text-right font-mono text-xs text-foreground-secondary">
              {formatAmount(stock.marketCap)}
            </span>
            <span className="text-right font-mono text-xs text-foreground-secondary">
              {formatAmount(stock.tradingValue)}
            </span>
            <span className="justify-self-end">
              <span
                className={cn(
                  'inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold',
                  changeColorClass(stock.change),
                  stock.change > 0 && 'bg-stock-up/10',
                  stock.change < 0 && 'bg-stock-down/10',
                )}
              >
                {formatChange(stock.change)}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
