import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { StockLogo } from '@/components/stock/StockLogo'
import type { CandlePeriod } from '@/lib/apiTypes'
import type { CandleRes, ThemeStockRes } from '@/lib/apiTypes'
import {
  changeColorClass,
  formatChange,
  formatChangeOrDash,
  formatCompactKrw,
  formatPriceOrDash,
} from '@/lib/format'
import { fromState } from '@/lib/navigation'
import { useCandles } from '@/lib/queries/useCandles'
import { changeStatusTag, marketCapLeaders } from '@/lib/themeMetrics'
import { cn } from '@/lib/utils'

const CHART_W = 560
const CHART_H = 110
const PAD = 6

function toPctSeries(candles: CandleRes[] | null): number[] | null {
  if (!candles || candles.length < 2) return null
  const base = candles[0].close || 1
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
  themeName: string
  stocks: ThemeStockRes[]
  period: CandlePeriod
}

export function LeaderStockCard({ themeName, stocks, period }: LeaderStockCardProps) {
  const { pathname } = useLocation()
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)
  const [hoveredTicker, setHoveredTicker] = useState<string | null>(null)

  const leaders = useMemo(() => marketCapLeaders(stocks), [stocks])

  const first = useCandles(leaders[0]?.stock.ticker ?? null, period)
  const second = useCandles(leaders[1]?.stock.ticker ?? null, period)
  const third = useCandles(leaders[2]?.stock.ticker ?? null, period)

  // 세 종목을 같은 세로축에 올려야 누가 더 올랐는지 선 높이로 비교된다
  const chart = useMemo(() => {
    const series = [first.data, second.data, third.data].map(toPctSeries)
    const all = series.flatMap((pcts) => pcts ?? [])
    if (all.length === 0) return null
    const min = Math.min(...all)
    const max = Math.max(...all)
    return {
      lines: series.map((pcts) =>
        pcts ? { path: linePath(pcts, min, max), periodReturn: pcts[pcts.length - 1] } : null,
      ),
      zeroY:
        min <= 0 && max >= 0
          ? PAD + (1 - (0 - min) / (max - min || 1)) * (CHART_H - PAD * 2)
          : null,
    }
  }, [first.data, second.data, third.data])

  if (leaders.length === 0) return null

  // 테마가 바뀌어 고른 종목이 사라지면 시총 1위로 돌아간다
  const tickers = leaders.map((l) => l.stock.ticker)
  const activeTicker =
    [hoveredTicker, selectedTicker].find((t) => t !== null && tickers.includes(t)) ?? tickers[0]
  const activeIndex = tickers.indexOf(activeTicker)
  const active = leaders[activeIndex].stock
  const activeLine = chart?.lines[activeIndex] ?? null
  const candlesLoading = [first, second, third].some((c) => c.loading)

  return (
    <section className="mt-4 card-surface p-5">
      <div className="mb-[9px] flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-[9px]">
          <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">
            {/* 종목이 셋이 안 되는 테마에서 "3대장"이라 부르지 않는다 */}
            {themeName} {leaders.length === 3 ? '3대장' : '대장주'}
          </h2>
          <span className="text-caption text-muted-foreground">
            시가총액 상위 <span className="font-mono tabular-nums">{leaders.length}</span>종목
          </span>
        </div>
        {activeLine && (
          <span className="text-caption text-muted-foreground">
            {active.name} 구간 수익률{' '}
            <span className={cn('font-mono font-medium', changeColorClass(activeLine.periodReturn))}>
              {formatChange(activeLine.periodReturn)}
            </span>
          </span>
        )}
      </div>

      <div className="grid gap-x-5 gap-y-3 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <ol onMouseLeave={() => setHoveredTicker(null)}>
          {leaders.map(({ stock, share }, i) => {
            const isActive = stock.ticker === activeTicker
            const tag = changeStatusTag(stock.changeStatus)
            return (
              <li
                key={stock.ticker}
                onMouseEnter={() => setHoveredTicker(stock.ticker)}
                className={cn(
                  'relative rounded-lg px-[9px] py-2',
                  isActive ? 'bg-muted' : 'hover:bg-muted',
                )}
              >
                {/* 행 전체가 차트 강조 버튼, 종목명만 그 위에 떠서 상세로 간다 */}
                <button
                  type="button"
                  aria-pressed={stock.ticker === (selectedTicker ?? tickers[0])}
                  aria-label={`${stock.name} 차트에서 강조`}
                  onClick={() => setSelectedTicker(stock.ticker)}
                  className="absolute inset-0 cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-primary"
                />
                <div className="pointer-events-none relative flex items-center gap-[9px]">
                  <span
                    className={cn(
                      'w-3 shrink-0 text-center font-mono text-xs font-semibold',
                      isActive ? 'text-chart-1' : 'text-foreground-tertiary',
                    )}
                  >
                    {i + 1}
                  </span>
                  <StockLogo ticker={stock.ticker} size={24} reserveSpace />
                  <Link
                    to={`/stock/${stock.ticker}`}
                    state={fromState(pathname)}
                    className="pointer-events-auto truncate text-sm font-semibold text-foreground hover:text-primary hover:underline"
                  >
                    {stock.name}
                  </Link>
                  {tag && (
                    <span
                      title={tag.title}
                      className="pointer-events-auto shrink-0 rounded border border-border px-1.5 py-0.5 text-caption leading-none text-muted-foreground"
                    >
                      {tag.label}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 font-mono text-sm font-medium text-foreground">
                    {formatPriceOrDash(stock.price)}
                  </span>
                  <span
                    className={cn(
                      'w-[58px] shrink-0 text-right font-mono text-xs font-medium',
                      stock.change === null
                        ? 'text-foreground-tertiary'
                        : changeColorClass(stock.change),
                    )}
                  >
                    {formatChangeOrDash(stock.change)}
                  </span>
                </div>
                <div className="pointer-events-none relative mt-1.5 flex items-center gap-[9px] pl-[21px] text-caption text-muted-foreground">
                  <span className="w-[84px] shrink-0 whitespace-nowrap">
                    시총 <span className="font-mono">{formatCompactKrw(stock.marketCap)}</span>
                  </span>
                  {share !== null && (
                    <>
                      <span
                        aria-hidden
                        className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-inset"
                      >
                        <span
                          className={cn(
                            'block h-full rounded-full',
                            isActive ? 'bg-chart-1' : 'bg-chart-2',
                          )}
                          style={{ width: `${Math.max(share, 1)}%` }}
                        />
                      </span>
                      <span
                        className="w-[58px] shrink-0 text-right font-mono tabular-nums"
                        title="구성 종목 시가총액 합 대비 비중"
                      >
                        {share.toFixed(1)}%
                      </span>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ol>

        <div className="flex min-h-[110px] flex-col">
          {chart ? (
            <svg
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              preserveAspectRatio="none"
              className="h-[110px] w-full md:h-full"
              role="img"
              aria-label={`대장주 ${leaders.length}종목의 시작점 대비 수익률, ${active.name} 강조`}
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
              {chart.lines.map(
                (line, i) =>
                  line &&
                  i !== activeIndex && (
                    <path
                      key={tickers[i]}
                      d={line.path}
                      fill="none"
                      stroke="var(--chart-2)"
                      strokeOpacity={0.5}
                      strokeWidth={1.2}
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  ),
              )}
              {activeLine && (
                <path
                  d={activeLine.path}
                  fill="none"
                  stroke="var(--chart-1)"
                  strokeWidth={1.8}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
          ) : candlesLoading ? (
            <div className="h-[110px] w-full animate-pulse rounded-lg bg-muted md:h-full" />
          ) : (
            <p className="m-auto text-caption text-muted-foreground">
              이 구간의 시세가 아직 없어요.
            </p>
          )}
          {chart && !activeLine && !candlesLoading && (
            <p className="mt-1.5 text-right text-caption text-muted-foreground">
              {active.name}은(는) 이 구간의 시세가 없어 선을 그리지 않았어요.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
