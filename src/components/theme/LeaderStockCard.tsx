import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { generateCandles, type Candle, type CandlePeriod } from '@/data/candles'
import { getMarketCap } from '@/data/stockMeta'
import { stockListRows } from '@/data/stockList'
import type { ThemeItem, ThemeStockItem } from '@/data/themes'
import { changeColorClass, formatChange, formatPrice } from '@/lib/format'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'


const ROW_BY_CODE = new Map(stockListRows.map((row) => [row.code, row]))

const CHART_W = 560
const CHART_H = 110
const PAD = 6

function toPctSeries(candles: Candle[]): number[] {
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
  theme: ThemeItem
  themeCandles: Candle[]
  period: CandlePeriod
}

export function LeaderStockCard({ theme, themeCandles, period }: LeaderStockCardProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const top3 = useMemo(
    () =>
      [...theme.stocks]
        .sort((a, b) => getMarketCap(b.code, b.price) - getMarketCap(a.code, a.price))
        .slice(0, 3),
    [theme.stocks],
  )
  const leader: ThemeStockItem | undefined = top3[0]

  const chart = useMemo(() => {
    if (!leader) return null
    const leaderCandles = generateCandles(
      `stock-${leader.code}`,
      period,
      leader.price,
      leader.change,
    )
    const leaderPct = toPctSeries(leaderCandles)
    const themePct = toPctSeries(themeCandles)
    const all = [...leaderPct, ...themePct]
    const min = Math.min(...all)
    const max = Math.max(...all)
    return {
      leaderPath: linePath(leaderPct, min, max),
      themePath: linePath(themePct, min, max),
      zeroY:
        min <= 0 && max >= 0
          ? PAD + (1 - (0 - min) / (max - min || 1)) * (CHART_H - PAD * 2)
          : null,
      excess: leaderPct[leaderPct.length - 1] - themePct[themePct.length - 1],
    }
  }, [leader, period, themeCandles])

  if (!leader || !chart) return null

  const leaderRow = ROW_BY_CODE.get(leader.code)
  const openStock = (code: string) =>
    navigate(`/stock/${code}`, { state: fromState(pathname) })

  return (
    <section className="mt-4 card-surface p-5">
      <div className="mb-[9px] flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-[9px]">
          <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">대장주</h2>
          <button
            type="button"
            onClick={() => openStock(leader.code)}
            className="cursor-pointer text-sm font-semibold text-foreground hover:text-primary hover:underline"
          >
            {leader.name}
          </button>
          <span className="font-mono text-sm font-medium text-foreground">
            {formatPrice(leader.price)}
          </span>
          <span className={cn('font-mono text-xs font-medium', changeColorClass(leader.change))}>
            {formatChange(leader.change)}
          </span>
        </div>
        <span className="text-caption text-muted-foreground">
          시가총액 기준 · 구간 초과수익{' '}
          <span className={cn('font-mono font-medium', changeColorClass(chart.excess))}>
            {formatChange(chart.excess)}p
          </span>
        </span>
      </div>

      {leaderRow && (
        <div className="mb-3 flex gap-4 text-caption text-muted-foreground">
          {(
            [
              ['1주', leaderRow.w1],
              ['1개월', leaderRow.m1],
              ['3개월', leaderRow.m3],
            ] as const
          ).map(([label, value]) => (
            <span key={label} className="flex items-baseline gap-1">
              {label}
              <span className={cn('font-mono text-xs font-medium', changeColorClass(value))}>
                {formatChange(value)}
              </span>
            </span>
          ))}
        </div>
      )}

      <div className="mb-1.5 flex items-center justify-end gap-3 text-caption text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 rounded" style={{ backgroundColor: 'var(--chart-1)' }} />
          {leader.name}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-0.5 w-4 rounded"
            style={{
              backgroundImage:
                'linear-gradient(90deg, var(--chart-2) 60%, transparent 60%)',
              backgroundSize: '6px 100%',
            }}
          />
          테마 지수
        </span>
      </div>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="none"
        className="h-[110px] w-full"
        role="img"
        aria-label={`${leader.name}와 테마 지수의 시작점 대비 수익률 비교`}
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
          d={chart.themePath}
          fill="none"
          stroke="var(--chart-2)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={chart.leaderPath}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth={1.8}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {top3.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-surface-inset pt-3">
          <span className="mr-[3px] text-caption text-muted-foreground">다음 주자</span>
          {top3.slice(1).map((stock) => (
            <button
              key={stock.code}
              type="button"
              onClick={() => openStock(stock.code)}
              className="flex cursor-pointer items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground hover:bg-surface-inset"
            >
              {stock.name}
              <span className={cn('font-mono', changeColorClass(stock.change))}>
                {formatChange(stock.change)}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
