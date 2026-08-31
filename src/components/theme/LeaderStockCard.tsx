import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { CandlePeriod } from '@/lib/apiTypes'
import type { CandleRes, ThemeStockRes } from '@/lib/apiTypes'
import { changeColorClass, formatChange, formatChangeOrDash, formatPriceOrDash } from '@/lib/format'
import { fromState } from '@/lib/navigation'
import { useCandles } from '@/lib/queries/useCandles'
import { cn } from '@/lib/utils'

const CHART_W = 560
const CHART_H = 110
const PAD = 6

function toPctSeries(candles: CandleRes[]): number[] {
  const base = candles[0]?.close || 1
  return candles.map((c) => ((c.close - base) / base) * 100)
}

function linePath(pcts: number[], min: number, max: number): string {
  const range = max - min || 1
  return pcts
    .map((p, i) => {
      const x = ((i / (pcts.length - 1)) * CHART_W).toFixed(1)
      const y = (PAD + (1 - (p - min) / range) * (CHART_H - PAD * 2)).toFixed(1)
      return `${i === 0 ? 'M' : 'L'}${x} ${y}`
    })
    .join('')
}

interface LeaderStockCardProps {
  stocks: ThemeStockRes[]
  period: CandlePeriod
}

export function LeaderStockCard({ stocks, period }: LeaderStockCardProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const top3 = stocks.slice(0, 3)
  const leader: ThemeStockRes | undefined = top3[0]

  const { data: candles } = useCandles(leader?.ticker ?? null, period)

  const chart = useMemo(() => {
    if (!candles || candles.length < 2) return null
    const pcts = toPctSeries(candles)
    const min = Math.min(...pcts)
    const max = Math.max(...pcts)
    return {
      leaderPath: linePath(pcts, min, max),
      zeroY:
        min <= 0 && max >= 0
          ? PAD + (1 - (0 - min) / (max - min || 1)) * (CHART_H - PAD * 2)
          : null,
      periodReturn: pcts[pcts.length - 1],
    }
  }, [candles])

  if (!leader) return null

  const openStock = (ticker: string) =>
    navigate(`/stock/${ticker}`, { state: fromState(pathname) })

  return (
    <section className="mt-4 card-surface p-5">
      <div className="mb-[9px] flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-[9px]">
          <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">대장주</h2>
          <button
            type="button"
            onClick={() => openStock(leader.ticker)}
            className="cursor-pointer text-sm font-semibold text-foreground hover:text-primary hover:underline"
          >
            {leader.name}
          </button>
          <span className="font-mono text-sm font-medium text-foreground">
            {formatPriceOrDash(leader.price)}
          </span>
          <span
            className={cn('font-mono text-xs font-medium', changeColorClass(leader.change ?? 0))}
          >
            {formatChangeOrDash(leader.change)}
          </span>
        </div>
        {chart && (
          <span className="text-caption text-muted-foreground">
            시가총액 기준 · 구간 수익률{' '}
            <span className={cn('font-mono font-medium', changeColorClass(chart.periodReturn))}>
              {formatChange(chart.periodReturn)}
            </span>
          </span>
        )}
      </div>

      <div className="mb-1.5 flex items-center justify-end gap-3 text-caption text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-0.5 w-4 rounded"
            style={{ backgroundColor: 'var(--chart-1)' }}
          />
          {leader.name}
        </span>
      </div>
      {chart ? (
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          preserveAspectRatio="none"
          className="h-[110px] w-full"
          role="img"
          aria-label={`${leader.name}의 시작점 대비 수익률`}
        >
          {chart.zeroY !== null && (
            <line
              x1={0}
              x2={CHART_W}
              y1={chart.zeroY}
              y2={chart.zeroY}
              stroke="var(--border)"
              strokeDasharray="2 4"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <path
            d={chart.leaderPath}
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth={1.8}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : (
        <div className="h-[110px] w-full animate-pulse rounded-lg bg-muted" />
      )}

      {top3.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-surface-inset pt-3">
          <span className="mr-[3px] text-caption text-muted-foreground">다음 주자</span>
          {top3.slice(1).map((stock) => (
            <button
              key={stock.ticker}
              type="button"
              onClick={() => openStock(stock.ticker)}
              className="flex cursor-pointer items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground hover:bg-surface-inset"
            >
              {stock.name}
              <span className={cn('font-mono', changeColorClass(stock.change ?? 0))}>
                {formatChangeOrDash(stock.change)}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
