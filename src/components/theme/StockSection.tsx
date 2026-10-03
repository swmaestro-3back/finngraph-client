import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { StockLogo } from '@/components/stock/StockLogo'
import { ChangeStatusTag } from '@/components/theme/ChangeStatusTag'
import type { ThemeStockRes } from '@/lib/apiTypes'
import {
  changeColorClass,
  formatAmountOrDash,
  formatChange,
  formatPriceOrDash,
  toEok,
  toMillion,
} from '@/lib/format'
import { changeStatusTag, compareNullLast } from '@/lib/themeMetrics'
import { cn } from '@/lib/utils'

const GRID =
  'grid gap-2 grid-cols-[minmax(0,1fr)_76px_72px] md:grid-cols-[minmax(0,1fr)_76px_78px_78px_62px] xl:gap-3 xl:grid-cols-[minmax(0,1fr)_80px_84px_84px_64px]'
const DESKTOP_COL = 'hidden md:block'

interface StockSectionProps {
  stocks: ThemeStockRes[]
  from: string
  className?: string
  listClassName?: string
}

export function StockSection({ stocks, from, className, listClassName }: StockSectionProps) {
  // 등락률 내림차순, 등락률 없는 종목은 뒤로
  const sorted = useMemo(
    () => [...stocks].sort((a, b) => compareNullLast(a.change, b.change, true)),
    [stocks],
  )

  return (
    <section className={cn('card-surface p-5', className)}>
      <div className="mb-[9px] flex min-h-[30px] items-center justify-between">
        <h2 className="text-lg font-medium tracking-[-0.5px] text-foreground">구성 종목</h2>
        <span className="text-caption text-muted-foreground">
          등락률순 · <span className="font-mono tabular-nums">{sorted.length}</span>개
        </span>
      </div>

      <div className={cn(GRID, 'border-b border-border pb-1.5 text-caption text-muted-foreground')}>
        <span className="truncate">종목명</span>
        <span className="whitespace-nowrap text-right">현재가</span>
        <span className={cn(DESKTOP_COL, 'whitespace-nowrap text-right')}>시가총액(억)</span>
        <span className={cn(DESKTOP_COL, 'whitespace-nowrap text-right')}>거래대금(백만)</span>
        <span className="whitespace-nowrap text-right">등락률</span>
      </div>

      <div className={cn(listClassName)}>
        {sorted.length === 0 && (
          <p className="px-1 py-8 text-center text-caption leading-relaxed text-muted-foreground break-keep">
            구성 종목이 아직 집계되지 않았어요.
            <br />
            테마 구성은 주 1회 갱신됩니다.
          </p>
        )}
        {sorted.map((stock) => {
          const tag = changeStatusTag(stock.changeStatus)
          const priced = stock.change !== null && !tag
          return (
          <Link
            key={stock.ticker}
            to={`/stock/${stock.ticker}`}
            state={{ from }}
            className={cn(
              GRID,
              'min-h-[44px] items-center border-b border-surface-inset py-1.5 hover:bg-muted',
            )}
          >
            <span className="flex min-w-0 items-center gap-[9px] overflow-hidden">
              <StockLogo ticker={stock.ticker} size={24} reserveSpace />
              <span className="truncate text-sm font-semibold text-foreground">{stock.name}</span>
              <span className="shrink-0 font-mono text-caption text-muted-foreground">
                {stock.ticker}
              </span>
            </span>
            <span className="text-right font-mono text-sm font-medium text-foreground">
              {formatPriceOrDash(stock.price)}
            </span>
            <span className={cn(DESKTOP_COL, 'text-right font-mono text-xs text-foreground-secondary')}>
              {formatAmountOrDash(toEok(stock.marketCap))}
            </span>
            <span className={cn(DESKTOP_COL, 'text-right font-mono text-xs text-foreground-secondary')}>
              {formatAmountOrDash(toMillion(stock.tradingValue))}
            </span>
            <span className="flex flex-col items-end gap-0.5 justify-self-end">
              <span
                className={cn(
                  'inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold',
                  priced ? changeColorClass(stock.change ?? 0) : 'text-muted-foreground',
                  priced && (stock.change ?? 0) > 0 && 'bg-stock-up/[0.06]',
                  priced && (stock.change ?? 0) < 0 && 'bg-stock-down/[0.06]',
                )}
              >
                {stock.change === null ? '—' : formatChange(stock.change)}
              </span>
              {tag && <ChangeStatusTag tag={tag} />}
            </span>
          </Link>
          )
        })}
      </div>
    </section>
  )
}
