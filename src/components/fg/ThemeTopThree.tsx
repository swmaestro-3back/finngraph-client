import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { ChangeText } from '@/components/fg/PriceChange'
import { Segment } from '@/components/fg/SegmentedTabs'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import type { ThemeRes, ThemeStockRes } from '@/lib/apiTypes'
import { formatChange, formatCompactKrw } from '@/lib/format'
import { formatPriceWon, marketLabel, toneClass } from '@/lib/fg/format'
import { stockPath } from '@/lib/fg/paths'
import { dateTicks, formatAxisPercent, monthDayLabel, niceAxis } from '@/lib/fg/themeCharts'
import { formatWeight } from '@/lib/fg/themeDetail'
import {
  DEFAULT_RETURN_PERIOD,
  LEADER_CANDLE_LIMIT,
  RETURN_PERIODS,
  leaderReturns,
  returnRange,
  spreadBand,
  topThreeGroup,
  topThreeRows,
  topThreeSubtitle,
  topThreeTitle,
  type ReturnPeriod,
  type TopThreeRow,
} from '@/lib/fg/topThree'
import { useChanged } from '@/lib/fg/useChanged'
import { useDelayed } from '@/lib/fg/useDelayed'
import { josa } from '@/lib/josa'
import { spreadLabels, type ReturnChart, type ReturnPoint } from '@/lib/leaderChart'
import { fromState } from '@/lib/navigation'
import { useCandlesCached } from '@/lib/queries/useCandles'
import { cn } from '@/lib/utils'

const VIEW_W = 600
const VIEW_H = 220
const END_GAP = 38
const END_TOP = 17
const END_BOTTOM = 203
const LINE_CLASSES = ['fg-t3c__s0', 'fg-t3c__s1', 'fg-t3c__s2'] as const

interface ThemeTopThreeProps {
  theme: ThemeRes
  stocks: readonly ThemeStockRes[] | null
  from: string
  refreshKey: number
  className?: string
}

export function ThemeTopThree({ theme, stocks, from, refreshKey, className }: ThemeTopThreeProps) {
  const [period, setPeriod] = useState<ReturnPeriod>(DEFAULT_RETURN_PERIOD)
  const [hl, setHl] = useState<number | null>(null)
  const rows = useMemo(() => topThreeRows(theme, stocks), [theme, stocks])
  const first = useCandlesCached(rows[0]?.ticker ?? null, 'D', LEADER_CANDLE_LIMIT)
  const second = useCandlesCached(rows[1]?.ticker ?? null, 'D', LEADER_CANDLE_LIMIT)
  const third = useCandlesCached(rows[2]?.ticker ?? null, 'D', LEADER_CANDLE_LIMIT)
  const { refresh: refreshFirst } = first
  const { refresh: refreshSecond } = second
  const { refresh: refreshThird } = third
  useEffect(() => {
    if (refreshKey === 0) return
    refreshFirst()
    refreshSecond()
    refreshThird()
  }, [refreshKey, refreshFirst, refreshSecond, refreshThird])
  const months = RETURN_PERIODS.find((p) => p.value === period)?.months ?? 6
  const sets = useMemo(
    () => [first.data, second.data, third.data].slice(0, rows.length),
    [first.data, second.data, third.data, rows.length],
  )
  const chart = useMemo(() => leaderReturns(sets, months), [sets, months])
  const states = [first, second, third].slice(0, rows.length)
  const loading = states.some((s) => s.loading)
  const failed = states.length > 0 && states.every((s) => s.error !== null)
  const waiting = useDelayed(chart === null && loading)

  if (rows.length === 0) return null

  const group = topThreeGroup(rows.length)
  const periodLabel = RETURN_PERIODS.find((p) => p.value === period)?.label ?? ''
  const clear = () => setHl(null)
  const retry = () => states.forEach((s) => s.refetch())

  let plot: ReactNode
  if (chart) {
    plot = <ReturnPlot chart={chart} rows={rows} group={group} period={period} periodLabel={periodLabel} hl={hl} />
  } else if (loading) {
    plot = (
      <div className="fg-t3c__wait" aria-hidden="true">
        {waiting && <Skeleton height="100%" />}
      </div>
    )
  } else if (failed) {
    plot = (
      <StateBlock
        kind="error"
        title="수익률을 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
        action={
          <Button size="sm" onClick={retry}>
            다시 시도
          </Button>
        }
      />
    )
  } else {
    plot = <StateBlock kind="empty" title="이 기간의 시세가 아직 없어요" description="시세가 쌓이면 수익률을 견줘 드려요" />
  }

  return (
    <section className={cn('fg-section', className)} aria-labelledby="fg-tdp-top3" data-slot="theme-top3">
      <div className="fg-section__head">
        <div className="fg-tdp__titles">
          <h2 id="fg-tdp-top3" className="fg-section__title">
            {topThreeTitle(theme.name, rows.length)}
          </h2>
          <p className="fg-section__sub fg-num">{topThreeSubtitle(rows)}</p>
        </div>
        <Segment label="수익률 기간" options={RETURN_PERIODS} value={period} onChange={setPeriod} />
      </div>
      <ol className="fg-t3list" aria-label={`시가총액 상위 ${rows.length}종목`}>
        {rows.map((row, i) => (
          <li key={row.ticker}>
            <Link
              to={stockPath(row.ticker)}
              state={fromState(from)}
              className="fg-t3"
              data-on={hl === i ? 'true' : undefined}
              onMouseEnter={() => setHl(i)}
              onFocus={() => setHl(i)}
              onMouseLeave={clear}
              onBlur={clear}
            >
              <span className="fg-t3__top">
                <span className="fg-t3__rank fg-num">{i + 1}</span>
                <CompanyLogo name={row.name} />
                <span className="fg-t3__who">
                  <b>{row.name}</b>
                  <small>{row.market ? marketLabel(row.market) : '—'}</small>
                </span>
                <svg className="fg-t3__sw" width="24" height="8" viewBox="0 0 24 8" aria-hidden="true">
                  <path className={cn('fg-t3c__swl', LINE_CLASSES[i])} d="M1 4H23" />
                </svg>
              </span>
              <span className="fg-t3__price fg-num">
                <b>{row.price === null ? '—' : formatPriceWon(row.price)}</b>
                {row.change !== null && <ChangeText value={row.change} />}
              </span>
              <span className="fg-t3__w fg-num">
                <span>
                  시총 <b>{formatCompactKrw(row.marketCap)}</b>
                </span>
                <span>
                  테마 내 비중 <b>{formatWeight(row.weight)}</b>
                </span>
              </span>
              <span className="fg-t3__bar" aria-hidden="true">
                <i style={{ width: `${Math.min(Math.max(row.weight ?? 0, 0), 100).toFixed(1)}%` }} />
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <div className="fg-t3c">
        {!chart && (
          <div className="fg-t3c__cap">
            <span className="fg-t3c__l">
              <b>수익률 비교</b>
            </span>
          </div>
        )}
        {plot}
      </div>
    </section>
  )
}

interface ReturnPlotProps {
  chart: ReturnChart
  rows: readonly TopThreeRow[]
  group: string
  period: ReturnPeriod
  periodLabel: string
  hl: number | null
}

type PathPoint = Pick<ReturnPoint, 'index' | 'pct'>

function linePath(points: readonly PathPoint[], x: (i: number) => number, y: (v: number) => number): string {
  return `M${points.map((p) => `${x(p.index).toFixed(1)},${y(p.pct).toFixed(1)}`).join('L')}`
}

function ReturnPlot({ chart, rows, group, period, periodLabel, hl }: ReturnPlotProps) {
  const redraw = useChanged(period) ? 'fg-reveal' : undefined
  const geometry = useMemo(() => {
    const band = spreadBand(chart)
    const range = returnRange({ min: chart.min, max: chart.max }, band)
    const axis = niceAxis(range.min, range.max, 5)
    const last = Math.max(chart.dates.length - 1, 1)
    const x = (i: number) => (i / last) * VIEW_W
    const y = (v: number) => ((axis.hi - v) / (axis.hi - axis.lo || 1)) * VIEW_H
    const upper = band.map((b) => ({ index: b.index, pct: b.upper }))
    const lower = [...band].reverse().map((b) => ({ index: b.index, pct: b.lower }))
    return {
      axis,
      last,
      y,
      band: band.length >= 2 ? `${linePath(upper, x, y)}L${linePath(lower, x, y).slice(1)}Z` : null,
      grid: axis.ticks.map((v) => `M0,${y(v).toFixed(1)}H${VIEW_W}`).join(''),
      zero: `M0,${y(0).toFixed(1)}H${VIEW_W}`,
      lines: chart.series.map((s) => (s ? linePath(s.points, x, y) : null)),
    }
  }, [chart])

  const year = Number(chart.dates[chart.dates.length - 1].slice(0, 4))
  const focusRow = rows[hl ?? 0]
  const focusSeries = chart.series[hl ?? 0] ?? null
  const ticks = dateTicks(chart.dates, period === '1y' ? 'even-months' : 'months')
  const drawn = chart.series.flatMap((s, i) => (s ? [{ i, series: s }] : []))
  const tops = spreadLabels(
    drawn.map(({ series }) => geometry.y(series.periodReturn)),
    END_GAP,
    END_TOP,
    END_BOTTOM,
  )
  const order = [...drawn].reverse().sort((a, b) => Number(a.i === hl) - Number(b.i === hl))
  const lineState = (i: number) => (hl === null ? undefined : hl === i ? 'is-on' : 'is-dim')
  const aria = `${group} ${periodLabel} 수익률 비교, ${rows
    .map((row, i) => {
      const s = chart.series[i]
      return s ? `${row.name} ${formatChange(s.periodReturn)}` : `${row.name} 시세 없음`
    })
    .join(', ')}`

  return (
    <>
      <div className="fg-t3c__cap fg-num fg-reveal">
        <span className="fg-t3c__l">
          <b>수익률 비교</b>
          <span>{monthDayLabel(chart.dates[0], year)} 종가 대비</span>
          {geometry.band && (
            <span className="fg-t3c__lg" title={`${group} 수익률의 평균 ± 표준편차`}>
              <i aria-hidden="true" />
              {group} 평균 밴드
            </span>
          )}
        </span>
        <span className="fg-t3c__r">
          {focusSeries ? (
            <>
              {focusRow.name} {periodLabel} 수익률{' '}
              <b className={toneClass(focusSeries.periodReturn)}>{formatChange(focusSeries.periodReturn)}</b>
            </>
          ) : (
            `${focusRow.name}${josa(focusRow.name, '은/는')} 이 기간 시세가 없어요`
          )}
        </span>
      </div>
      <div className="fg-t3c__body fg-reveal">
        <div className="fg-t3c__y fg-num" aria-hidden="true">
          {geometry.axis.ticks.map((v) => (
            <span key={v} style={{ top: `${((geometry.y(v) / VIEW_H) * 100).toFixed(2)}%` }}>
              {formatAxisPercent(v)}
            </span>
          ))}
        </div>
        <div className="fg-t3c__plot">
          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" role="img" aria-label={aria}>
            <path className="fg-t3c__grid" d={geometry.grid} vectorEffect="non-scaling-stroke" />
            {geometry.band && (
              <g key={`band-${period}`} className={redraw}>
                <path className="fg-t3c__band" d={geometry.band} />
              </g>
            )}
            <path className="fg-t3c__zero" d={geometry.zero} vectorEffect="non-scaling-stroke" />
            <g key={`lines-${period}`} className={redraw}>
              {order.map(({ i }) => (
                <path
                  key={rows[i].ticker}
                  className={cn('fg-t3c__line', LINE_CLASSES[i], lineState(i))}
                  d={geometry.lines[i] ?? ''}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          </svg>
          <div className="fg-t3c__x" aria-hidden="true">
            {ticks.map((tick) => (
              <span key={tick.index} style={{ left: `${((tick.index / geometry.last) * 100).toFixed(2)}%` }}>
                {tick.label}
              </span>
            ))}
          </div>
        </div>
        <div className="fg-t3c__ends" aria-hidden="true">
          {drawn.map(({ i, series }, k) => {
            const row = rows[i]
            const price = row.price ?? series.points[series.points.length - 1].close ?? null
            return (
              <span
                key={row.ticker}
                className={cn('fg-t3c__end', hl !== null && hl !== i && 'is-dim')}
                style={{ top: `${((tops[k] / VIEW_H) * 100).toFixed(2)}%` }}
              >
                <CompanyLogo name={row.name} size={16} />
                <span className="fg-t3c__endt fg-num">
                  <b>{row.name}</b>
                  <span>{price === null ? '—' : formatPriceWon(price)}</span>
                </span>
              </span>
            )
          })}
        </div>
      </div>
    </>
  )
}
