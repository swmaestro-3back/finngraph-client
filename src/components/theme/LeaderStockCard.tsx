import { useMemo, useState, type CSSProperties, type PointerEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChipGroup } from '@/components/layout/ChipGroup'
import { StockLogo } from '@/components/stock/StockLogo'
import type { ThemeStockRes } from '@/lib/apiTypes'
import {
  changeColorClass,
  formatChange,
  formatChangeOrDash,
  formatCompactKrw,
  formatPrice,
  formatPriceOrDash,
} from '@/lib/format'
import {
  DEFAULT_BAND,
  buildReturnChart,
  monthTicks,
  nearestDateIndex,
  niceTicks,
  spreadLabels,
  type BandPoint,
  type ReturnPoint,
} from '@/lib/leaderChart'
import { fromState } from '@/lib/navigation'
import { useCandles } from '@/lib/queries/useCandles'
import { changeStatusTag, formatMonthDay, marketCapLeaders } from '@/lib/themeMetrics'
import { cn } from '@/lib/utils'

const CHART_W = 560
const CHART_H = 200
const PAD = 10

// 일봉을 한 번 받아 두고 칩에 따라 잘라 쓴다 — 1개월 ≈ 20거래일
const RANGES = [
  { key: '3M', label: '3개월', limit: 60 },
  { key: '6M', label: '6개월', limit: 120 },
  // 쌓인 일봉이 1년에 못 미치는 동안은 있는 만큼만 그린다
  { key: '1Y', label: '1년', limit: 245 },
] as const
type RangeKey = (typeof RANGES)[number]['key']

// 가장 긴 구간의 첫날에도 밴드가 나오도록 이동평균 창만큼 더 받는다
const CANDLE_LIMIT = Math.max(...RANGES.map((r) => r.limit)) + DEFAULT_BAND.window - 1

/** 종목별 선 색 — 상승 빨강·하락 파랑·평균 밴드 노랑과 겹치지 않는 조합 (index.css --series-*) */
const LINE_COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)']
/** 비중 막대 — 선과 같은 색을 연한 채움 + 또렷한 테두리로 쓴다 (뉴스 "분석" 뱃지와 같은 틀) */
const BAR_CLASSES = [
  'border-series-1/60 bg-series-1/15',
  'border-series-2/60 bg-series-2/15',
  'border-series-3/60 bg-series-3/15',
]

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

interface LeaderStockCardProps {
  themeName: string
  stocks: ThemeStockRes[]
  /** 다른 카드 안에 넣을 때 — 카드 면을 빼고 윗선으로만 구분하며, 제목에서 테마명을 뺀다 */
  embedded?: boolean
}

export function LeaderStockCard({ themeName, stocks, embedded = false }: LeaderStockCardProps) {
  const { pathname, search } = useLocation()
  const [hoveredTicker, setHoveredTicker] = useState<string | null>(null)
  const [rangeKey, setRangeKey] = useState<RangeKey>('6M')
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const leaders = useMemo(() => marketCapLeaders(stocks), [stocks])
  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[1]

  const first = useCandles(leaders[0]?.stock.ticker ?? null, 'D', CANDLE_LIMIT)
  const second = useCandles(leaders[1]?.stock.ticker ?? null, 'D', CANDLE_LIMIT)
  const third = useCandles(leaders[2]?.stock.ticker ?? null, 'D', CANDLE_LIMIT)

  // 세 종목을 같은 세로축에 올려야 누가 더 올랐는지 선 높이로 비교된다
  const chart = useMemo(
    () => buildReturnChart([first.data, second.data, third.data], range.limit),
    [first.data, second.data, third.data, range.limit],
  )

  if (leaders.length === 0) return null

  const tickers = leaders.map((l) => l.stock.ticker)
  const groupLabel = leaders.length === 3 ? '3대장' : '대장주'
  // 행에 올려 둔 동안만 그 종목을 도드라지게 하고 나머지 선을 흐린다
  const emphasizedIndex = hoveredTicker === null ? -1 : tickers.indexOf(hoveredTicker)
  // 수익률 문구의 기준 종목 — 올려 둔 행이 없으면 시총 1위
  const activeIndex = Math.max(emphasizedIndex, 0)
  const active = leaders[activeIndex].stock
  const activeSeries = chart?.series[activeIndex] ?? null
  const averageBand = chart?.average && chart.average.band.length >= 2 ? chart.average.band : null
  const candlesLoading = [first, second, third].some((c) => c.loading)

  // 선과 평균 밴드를 모두 담는 범위 — 어느 행을 올려도 축이 흔들리지 않는다
  const lo = chart?.bandMin ?? 0
  const hi = chart?.bandMax ?? 0
  const yTicks = chart ? niceTicks(lo, hi) : []
  const xTicks = chart ? monthTicks(chart.dates) : []
  // 오른쪽 끝에 며칠만 걸친 달은 이름을 적을 자리가 없어 격자선만 둔다
  const monthLabels = xTicks.filter(
    (tick) => tick.index / Math.max((chart?.dates.length ?? 0) - 1, 1) <= 0.94,
  )
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

  const dateCount = chart?.dates.length ?? 0
  // 기간을 줄인 직후 남아 있는 예전 위치는 버린다
  const hover = hoverIndex !== null && hoverIndex < dateCount ? hoverIndex : null
  const leftOf = (index: number) => (index / (dateCount - 1)) * 100
  const hoverLeft = hover === null ? 0 : leftOf(hover)

  const trackPointer = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHoverIndex(nearestDateIndex((e.clientX - rect.left) / rect.width, dateCount))
  }

  return (
    <section className={embedded ? 'mt-4 border-t border-border pt-4' : 'mt-4 card-surface p-5'}>
      <div className="mb-[9px] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-[9px]">
          <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">
            {/* 종목이 셋이 안 되는 테마에서 "3대장"이라 부르지 않는다 */}
            {embedded ? groupLabel : `${themeName} ${groupLabel}`}
          </h2>
          <span className="text-caption text-muted-foreground">
            시가총액 상위 <span className="font-mono tabular-nums">{leaders.length}</span>종목
          </span>
        </div>
        <ChipGroup options={RANGES} value={rangeKey} onChange={setRangeKey} />
      </div>

      <div className="grid gap-x-5 gap-y-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <ol className="flex flex-col gap-1" onMouseLeave={() => setHoveredTicker(null)}>
          {leaders.map(({ stock, share }, i) => {
            const tag = changeStatusTag(stock.changeStatus)
            return (
              <li
                key={stock.ticker}
                onMouseEnter={() => setHoveredTicker(stock.ticker)}
                className="group relative rounded-lg px-[9px] py-5 hover:bg-muted"
              >
                {/* 행 전체가 종목 상세로 가는 링크 — 올려 두는 동안 차트에서 그 종목 선을 도드라지게 한다 */}
                <Link
                  to={`/stock/${stock.ticker}`}
                  state={fromState(pathname + search)}
                  aria-label={`${stock.name} 종목 상세 보기`}
                  onFocus={() => setHoveredTicker(stock.ticker)}
                  onBlur={() => setHoveredTicker(null)}
                  className="absolute inset-0 rounded-lg focus-visible:outline-2 focus-visible:outline-primary"
                />
                <div className="pointer-events-none relative flex items-center gap-[9px]">
                  <span className="w-3 shrink-0 text-center font-mono text-[13px] font-semibold text-foreground-tertiary">
                    {i + 1}
                  </span>
                  <StockLogo ticker={stock.ticker} size={28} reserveSpace />
                  {/* 폭이 모자라면 종목명을 자르기 전에 시장·상태 라벨부터 다음 줄로 넘겨 숨긴다 */}
                  <span className="flex h-6 min-w-0 flex-1 flex-wrap items-center gap-x-[9px] overflow-hidden">
                    <span className="max-w-full truncate text-[15px] leading-6 font-semibold text-foreground group-hover:underline">
                      {stock.name}
                    </span>
                    <span className="shrink-0 rounded bg-surface-inset px-1.5 py-0.5 text-micro leading-none tracking-[0.4px] text-muted-foreground">
                      {stock.market}
                    </span>
                    {tag && (
                      <span
                        title={tag.title}
                        className="shrink-0 rounded border border-border px-1.5 py-0.5 text-caption leading-none text-muted-foreground"
                      >
                        {tag.label}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-[15px] font-medium text-foreground">
                    {formatPriceOrDash(stock.price)}
                  </span>
                  <span
                    className={cn(
                      'w-[62px] shrink-0 text-right font-mono text-[13px] font-medium',
                      stock.change === null
                        ? 'text-foreground-tertiary'
                        : changeColorClass(stock.change),
                    )}
                  >
                    {formatChangeOrDash(stock.change)}
                  </span>
                </div>
                <div className="pointer-events-none relative mt-3.5 flex items-baseline justify-between gap-3 pl-[21px] text-[13px] text-muted-foreground">
                  <span className="whitespace-nowrap">
                    시총{' '}
                    <span className="font-mono text-foreground-secondary">
                      {formatCompactKrw(stock.marketCap)}
                    </span>
                  </span>
                  {share !== null && (
                    <span className="whitespace-nowrap">
                      테마 내 비중{' '}
                      <span className="font-mono font-medium tabular-nums text-foreground-secondary">
                        {share.toFixed(1)}%
                      </span>
                    </span>
                  )}
                </div>
                {share !== null && (
                  <div
                    aria-hidden
                    className="pointer-events-none relative mt-3 ml-[21px] h-3 overflow-hidden rounded-[3px] bg-surface-inset"
                  >
                    {/* 막대 색이 차트에서 이 종목의 선 색이다 */}
                    <span
                      className={cn('block h-full rounded-[3px] border', BAR_CLASSES[i])}
                      style={{ width: `max(${share}%, 6px)` }}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ol>

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
                      {active.name} {range.label} 수익률{' '}
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
                    aria-label={`대장주 ${leaders.length}종목의 최근 ${range.label} 수익률과 평균 밴드`}
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
                        <path
                          d={bandAreaPath(averageBand, dateCount, lo, hi)}
                          fill="var(--chart-5)"
                          fillOpacity={0.11}
                        />
                        {(['upper', 'lower'] as const).map((edge) => (
                          <path
                            key={edge}
                            d={linePath(
                              averageBand.map((b) => ({ index: b.index, pct: b[edge] })),
                              dateCount,
                              lo,
                              hi,
                            )}
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
                              d={linePath(series.points, dateCount, lo, hi)}
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
      </div>
    </section>
  )
}
