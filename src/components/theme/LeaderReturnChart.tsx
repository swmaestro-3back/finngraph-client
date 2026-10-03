import { useMemo, useState, type CSSProperties, type PointerEvent } from 'react'
import { StockLogo } from '@/components/stock/StockLogo'
import { changeColorClass, formatChange, formatPrice } from '@/lib/format'
import {
  DEFAULT_BAND,
  monthTicks,
  nearestDateIndex,
  niceTicks,
  spreadLabels,
  type BandPoint,
  type ReturnChart,
  type ReturnPoint,
} from '@/lib/leaderChart'
import { formatMonthDay, type MarketCapLeader } from '@/lib/themeMetrics'
import { cn } from '@/lib/utils'

const CHART_W = 560
const CHART_H = 200
const PAD = 10

/** 종목별 선 색 — 상승 빨강·하락 파랑·평균 밴드 노랑과 겹치지 않는 조합 (index.css --series-*) */
const LINE_COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)']

const BAND_HELP = `${DEFAULT_BAND.window}일 이동평균 ± ${DEFAULT_BAND.k} 표준편차 — 평소 움직이는 범위`

function yOf(pct: number, min: number, max: number): number {
  return PAD + (1 - (pct - min) / (max - min || 1)) * (CHART_H - PAD * 2)
}

function linePath(points: ReturnPoint[], dateCount: number, min: number, max: number): string {
  return points
    .map((p, i) => {
      const x = ((p.index / (dateCount - 1)) * CHART_W).toFixed(1)
      return `${i === 0 ? 'M' : 'L'}${x} ${yOf(p.pct, min, max).toFixed(1)}`
    })
    .join('')
}

function bandAreaPath(band: BandPoint[], dateCount: number, min: number, max: number): string {
  const upper = band.map((b) => ({ index: b.index, pct: b.upper }))
  const lower = band.map((b) => ({ index: b.index, pct: b.lower })).reverse()
  return `${linePath(upper, dateCount, min, max)}L${linePath(lower, dateCount, min, max).slice(1)}Z`
}

function axisPercent(pct: number): string {
  if (pct === 0) return '0%'
  return `${pct > 0 ? '+' : '−'}${Math.abs(pct)}%`
}

interface LeaderReturnChartProps {
  chart: ReturnChart | null
  leaders: MarketCapLeader[]
  rangeLabel: string
  groupLabel: string
  /** 왼쪽 목록에서 올려 둔 종목의 index — 없으면 -1 */
  emphasizedIndex: number
  candlesLoading: boolean
}

/**
 * 대장주 수익률 비교 차트 — 카드의 오른쪽 열.
 * hover는 여기서만 돈다: 포인터가 움직일 때 왼쪽 목록까지 다시 그리지 않고, 경로 문자열은 chart가 바뀔 때만 만든다.
 */
export function LeaderReturnChart({
  chart,
  leaders,
  rangeLabel,
  groupLabel,
  emphasizedIndex,
  candlesLoading,
}: LeaderReturnChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const tickers = leaders.map((l) => l.stock.ticker)
  // 수익률 문구의 기준 종목 — 올려 둔 행이 없으면 시총 1위
  const activeIndex = Math.max(emphasizedIndex, 0)
  const active = leaders[activeIndex].stock
  const activeSeries = chart?.series[activeIndex] ?? null
  const averageBand = chart?.average && chart.average.band.length >= 2 ? chart.average.band : null

  // 선과 평균 밴드를 모두 담는 범위 — 어느 행을 올려도 축이 흔들리지 않는다
  const lo = chart?.bandMin ?? 0
  const hi = chart?.bandMax ?? 0
  const dateCount = chart?.dates.length ?? 0

  // SVG 경로는 chart가 같으면 다시 만들지 않는다 — hover마다 3,400번의 toFixed를 되풀이하지 않도록
  const paths = useMemo(
    () => ({
      band: averageBand ? bandAreaPath(averageBand, dateCount, lo, hi) : null,
      bandEdges: averageBand
        ? (['upper', 'lower'] as const).map((edge) =>
            linePath(
              averageBand.map((b) => ({ index: b.index, pct: b[edge] })),
              dateCount,
              lo,
              hi,
            ),
          )
        : null,
      lines: (chart?.series ?? []).map((series) =>
        series ? linePath(series.points, dateCount, lo, hi) : null,
      ),
    }),
    [chart, averageBand, dateCount, lo, hi],
  )

  const yTicks = chart ? niceTicks(lo, hi) : []
  const xTicks = chart ? monthTicks(chart.dates) : []
  // 오른쪽 끝에 며칠만 걸친 달은 이름을 적을 자리가 없어 격자선만 둔다
  const monthLabels = xTicks.filter((tick) => tick.index / Math.max(dateCount - 1, 1) <= 0.94)
  const topOf = (pct: number) => `${(yOf(pct, lo, hi) / CHART_H) * 100}%`
  // 세로축이 수익률이라 주가는 축에서 읽을 수 없다 — 선 끝 이름표에 종목마다 마지막 종가를 적는다
  const endPrices = (chart?.series ?? []).map((series) => {
    const close = series?.points[series.points.length - 1].close
    return close === undefined ? '' : formatPrice(close)
  })
  // 종가 칸 너비 — 가장 긴 숫자에 맞춘다 (12px 고정폭 ≈ 7.2px/자)
  const priceWidth = Math.max(...endPrices.map((label) => label.length), 0) * 7.2
  // 선 끝 이름표 — 마지막 값 높이에 두되 서로 겹치면 벌린다
  const labelTops = spreadLabels(
    (chart?.series ?? []).map((series) =>
      series ? (yOf(series.periodReturn, lo, hi) / CHART_H) * 100 : 0,
    ),
    7,
    3,
    97,
  )
  // 넓은 화면의 이름표 칸 — 로고(24px) + 이름 + 종가. 좁은 화면은 로고만 둔다
  const labelGutter =
    Math.min(Math.max(...leaders.map((l) => l.stock.name.length)) * 12 + 12, 84) +
    24 +
    (priceWidth > 0 ? priceWidth + 6 : 0)

  // 기간을 줄인 직후 남아 있는 예전 위치는 버린다
  const hover = hoverIndex !== null && hoverIndex < dateCount ? hoverIndex : null
  const leftOf = (index: number) => (index / (dateCount - 1)) * 100
  const hoverLeft = hover === null ? 0 : leftOf(hover)

  const trackPointer = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHoverIndex(nearestDateIndex((e.clientX - rect.left) / rect.width, dateCount))
  }

  return (
    <div className="flex min-w-0 flex-col">
      {chart ? (
        <>
          {/* 세로축이 주가가 아니라 수익률임을 먼저 알린다 — 0% 기준일까지 함께 적는다 */}
          <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
            <h3 className="text-sm font-medium text-foreground">수익률 비교</h3>
            <span className="text-xs text-muted-foreground">
              <span className="font-mono tabular-nums">
                {formatMonthDay(chart.dates[0])}
              </span>{' '}
              종가 대비
            </span>
          </div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {averageBand && (
                <span className="flex items-center gap-1.5" title={BAND_HELP}>
                  <span
                    aria-hidden
                    className="h-2.5 w-4 rounded-[3px] border-y border-chart-5/40 bg-chart-5/15"
                  />
                  {groupLabel} 평균 밴드
                </span>
              )}
            </div>
            <span>
              {activeSeries ? (
                <>
                  <span
                    aria-hidden
                    className="mr-1.5 inline-block size-1.5 rounded-full align-middle"
                    style={{ backgroundColor: LINE_COLORS[activeIndex] }}
                  />
                  {active.name} {rangeLabel} 수익률{' '}
                  <span
                    className={cn(
                      'font-mono font-medium',
                      changeColorClass(activeSeries.periodReturn),
                    )}
                  >
                    {formatChange(activeSeries.periodReturn)}
                  </span>
                </>
              ) : (
                `${active.name}은(는) 이 기간의 시세가 없어 선을 그리지 않았어요.`
              )}
            </span>
          </div>

          {/* 왼쪽 눈금은 세 종목 공통 수익률, 선 끝에 종목 이름표와 마지막 종가.
              좁은 화면에서는 이름표를 로고만 남기고 툴팁으로만 주가를 보여준다 */}
          <div
            className="grid flex-1 grid-cols-[44px_minmax(0,1fr)_32px] grid-rows-[260px_auto] font-mono text-xs md:grid-cols-[44px_minmax(0,1fr)_var(--label-gutter)] md:grid-rows-[minmax(320px,1fr)_auto]"
            style={{ '--label-gutter': `${labelGutter}px` } as CSSProperties}
          >
            <div className="relative text-foreground-tertiary">
              {yTicks.map((t) => (
                <span
                  key={t}
                  className="absolute right-2 -translate-y-1/2 tabular-nums"
                  style={{ top: topOf(t) }}
                >
                  {axisPercent(t)}
                </span>
              ))}
            </div>

            <div
              className="relative touch-pan-y border-b border-border"
              onPointerMove={trackPointer}
              onPointerDown={trackPointer}
              onPointerLeave={() => setHoverIndex(null)}
            >
              <svg
                viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
                role="img"
                aria-label={`대장주 ${leaders.length}종목의 최근 ${rangeLabel} 수익률과 평균 밴드`}
              >
                {xTicks.map((tick) => (
                  <line
                    key={tick.index}
                    x1={(tick.index / (dateCount - 1)) * CHART_W}
                    x2={(tick.index / (dateCount - 1)) * CHART_W}
                    y1={0}
                    y2={CHART_H}
                    stroke="var(--surface-inset)"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {yTicks.map((t) => (
                  <line
                    key={t}
                    x1={0}
                    x2={CHART_W}
                    y1={yOf(t, lo, hi)}
                    y2={yOf(t, lo, hi)}
                    stroke={t === 0 ? 'var(--foreground-tertiary)' : 'var(--surface-inset)'}
                    strokeOpacity={t === 0 ? 0.55 : 1}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {averageBand && (
                  <>
                    <path d={paths.band ?? ''} fill="var(--chart-5)" fillOpacity={0.11} />
                    {(['upper', 'lower'] as const).map((edge, edgeIndex) => (
                      <path
                        key={edge}
                        d={paths.bandEdges?.[edgeIndex] ?? ''}
                        fill="none"
                        stroke="var(--chart-5)"
                        strokeOpacity={0.35}
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                  </>
                )}
                {hover !== null && (
                  <line
                    x1={(hover / (dateCount - 1)) * CHART_W}
                    x2={(hover / (dateCount - 1)) * CHART_W}
                    y1={0}
                    y2={CHART_H}
                    stroke="var(--foreground-tertiary)"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {/* 도드라지게 할 선을 마지막에 그려 맨 위에 오게 한다 */}
                {chart.series
                  .map((series, i) => ({ series, i }))
                  .sort(
                    (a, b) => Number(a.i === emphasizedIndex) - Number(b.i === emphasizedIndex),
                  )
                  .map(
                    ({ series, i }) =>
                      series && (
                        <path
                          key={tickers[i]}
                          d={paths.lines[i] ?? ''}
                          fill="none"
                          stroke={LINE_COLORS[i]}
                          strokeOpacity={
                            emphasizedIndex === -1 || i === emphasizedIndex ? 1 : 0.25
                          }
                          strokeWidth={i === emphasizedIndex ? 2.4 : 1.8}
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        />
                      ),
                  )}
              </svg>

              {hover !== null && (
                <>
                  {/* 늘려 그리는 svg 안에서는 원이 찌그러져서 점은 바깥에 올린다 */}
                  {chart.series.map((series, i) => {
                    const point = series?.points.find((p) => p.index === hover)
                    if (!point) return null
                    return (
                      <span
                        key={tickers[i]}
                        aria-hidden
                        className="pointer-events-none absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-card"
                        style={{
                          left: `${hoverLeft}%`,
                          top: topOf(point.pct),
                          backgroundColor: LINE_COLORS[i],
                        }}
                      />
                    )
                  })}
                  <div
                    className={cn(
                      'pointer-events-none absolute top-1 z-10 rounded-md border border-border bg-popover px-2.5 py-2 whitespace-nowrap',
                      hoverLeft > 50 ? '-translate-x-full -ml-2' : 'ml-2',
                    )}
                    style={{ left: `${hoverLeft}%` }}
                  >
                    <div className="mb-1 text-muted-foreground">
                      {formatMonthDay(chart.dates[hover])}
                    </div>
                    <div className="grid grid-cols-[auto_auto_auto] items-center gap-x-3 gap-y-0.5">
                      {leaders.map(({ stock }, i) => {
                        const point = chart.series[i]?.points.find((p) => p.index === hover)
                        return (
                          <div key={stock.ticker} className="contents">
                            <span className="flex items-center gap-1.5 font-sans text-foreground">
                              <span
                                aria-hidden
                                className="size-1.5 rounded-full"
                                style={{ backgroundColor: LINE_COLORS[i] }}
                              />
                              {stock.name}
                            </span>
                            <span className="text-right tabular-nums text-foreground">
                              {point?.close === undefined ? '—' : formatPrice(point.close)}
                            </span>
                            <span
                              className={cn(
                                'text-right tabular-nums',
                                point
                                  ? changeColorClass(point.pct)
                                  : 'text-foreground-tertiary',
                              )}
                            >
                              {point ? formatChange(point.pct) : '—'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="relative font-sans font-medium">
              {chart.series.map(
                (series, i) =>
                  series && (
                    <span
                      key={tickers[i]}
                      className={cn(
                        'absolute right-0 left-1.5 flex -translate-y-1/2 items-center gap-1.5 text-foreground-secondary',
                        emphasizedIndex !== -1 && i !== emphasizedIndex && 'opacity-30',
                      )}
                      style={{ top: `${labelTops[i]}%` }}
                    >
                      {/* 로고 테두리가 선 색 — 글자는 본문 색으로 두고 색은 표식만 맡는다 */}
                      <span
                        className="shrink-0 rounded-full border-[1.5px] p-px"
                        style={{ borderColor: LINE_COLORS[i] }}
                      >
                        <StockLogo
                          ticker={tickers[i]}
                          size={18}
                          reserveSpace
                          className="block"
                        />
                      </span>
                      <span className="hidden min-w-0 flex-1 truncate md:inline">
                        {leaders[i].stock.name}
                      </span>
                      <span className="hidden shrink-0 font-mono font-normal tabular-nums text-foreground-tertiary md:inline">
                        {endPrices[i]}
                      </span>
                    </span>
                  ),
              )}
            </div>

            <span className="pt-1.5 pr-2 text-right font-sans text-foreground-tertiary">
              수익률
            </span>
            <div className="relative h-6 text-foreground-tertiary">
              {/* 달이 많으면 글자가 붙으므로 한 달 걸러 적는다 — 세로 격자선은 매달 그대로 둔다 */}
              {monthLabels
                .filter(
                  (_, i) => monthLabels.length <= 7 || (monthLabels.length - 1 - i) % 2 === 0,
                )
                .map((tick) => (
                  <span
                    key={tick.index}
                    className={cn(
                      'absolute top-1.5 font-sans whitespace-nowrap',
                      // 오른쪽 끝에 붙은 달은 안쪽으로 당겨 잘리지 않게 한다
                      leftOf(tick.index) > 88 ? '-translate-x-full pr-1' : 'pl-1',
                    )}
                    style={{ left: `${leftOf(tick.index)}%` }}
                  >
                    {tick.label}
                  </span>
                ))}
            </div>
          </div>
        </>
      ) : candlesLoading ? (
        <div className="h-[340px] w-full animate-pulse rounded-lg bg-muted md:h-full" />
      ) : (
        <p className="m-auto py-8 text-caption text-muted-foreground">
          이 기간의 시세가 아직 없어요.
        </p>
      )}
    </div>
  )
}
