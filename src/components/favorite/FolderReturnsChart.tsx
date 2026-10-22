import { useMemo, useState, type PointerEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
// Lucian UX/UI Prompt #096 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#096
// Lucian UX/UI Prompt #299 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#299
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { Segment } from '@/components/fg/SegmentedTabs'
import { ShareBar } from '@/components/fg/ShareBar'
import { Skeleton } from '@/components/fg/Skeleton'
import { RetryNote } from '@/components/fg/RetryText'
import { getData } from '@/lib/api'
import type { FavoriteReturnsRes, FolderReturnPeriod, MemberReturnRes, ReturnPointRes } from '@/lib/apiTypes'
import { formatChange } from '@/lib/format'
import { moverSet, returnTicks } from '@/lib/fg/folders'
import { toneClass, toneOf } from '@/lib/fg/format'
import { stockPath } from '@/lib/fg/paths'
import { formatAxisPercent, monthDayLabel, niceAxis } from '@/lib/fg/themeCharts'
import { fromState } from '@/lib/navigation'
import { useKeyed } from '@/lib/queries/useKeyed'
import { cn } from '@/lib/utils'

const PERIODS = [
  { value: '1W', label: '1주' },
  { value: '1M', label: '1개월' },
  { value: '3M', label: '3개월' },
] as const satisfies readonly { value: FolderReturnPeriod; label: string }[]

const PERIOD_WORD: Record<FolderReturnPeriod, string> = { '1W': '1주', '1M': '1개월', '3M': '3개월' }

const VIEW_W = 600
const VIEW_H = 180
const AXIS_STEPS = 4
const ALL = 'all'

function loadReturns(key: string): Promise<FavoriteReturnsRes> {
  const [id, period] = key.split('|')
  const path = id === ALL ? '/v1/me/favorites/returns' : `/v1/me/favorite-folders/${id}/returns`
  return getData<FavoriteReturnsRes>(path, { period })
}

interface FolderReturnsChartProps {
  folderId: number | null
  name: string
  memberKey: string
}

export function FolderReturnsChart({ folderId, name, memberKey }: FolderReturnsChartProps) {
  const [period, setPeriod] = useState<FolderReturnPeriod>('1M')
  const returns = useKeyed(`${folderId ?? ALL}|${period}|${memberKey}`, loadReturns)
  const data = returns.data

  return (
    <figure className="fg-mine__chart">
      <figcaption className="fg-mine__charthead">
        <span className="fg-mine__charttitle">{folderId === null ? '관심 종목 수익률' : '이 테마 수익률'}</span>
        <Segment label="수익률 기간" options={PERIODS} value={period} onChange={setPeriod} />
      </figcaption>
      {returns.error ? (
        <RetryNote subject="수익률" onRetry={returns.retry} />
      ) : !data ? (
        <Skeleton height={VIEW_H + 48} />
      ) : data.stockCount === 0 || data.points.length === 0 ? (
        <p className="fg-mine__chartempty">
          {folderId === null
            ? '관심 종목의 시세가 아직 없어 수익률을 그릴 수 없어요'
            : '종목을 담으면 같은 비중으로 묶은 수익률을 보여드려요'}
        </p>
      ) : (
        <ReturnPlot data={data} name={name} period={period} scope={folderId === null ? '관심 종목' : '담은 종목'} />
      )}
    </figure>
  )
}

interface ReturnPlotProps {
  data: FavoriteReturnsRes
  name: string
  period: FolderReturnPeriod
  scope: string
}

function valueOn(points: readonly ReturnPointRes[], date: string): number | null {
  return points.find((point) => point.date === date)?.value ?? null
}

function ReturnPlot({ data, name, period, scope }: ReturnPlotProps) {
  const { pathname, search } = useLocation()
  const state = fromState(`${pathname}${search}`)
  const [hover, setHover] = useState<number | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const dates = useMemo(() => data.points.map((point) => point.date), [data])
  const movers = useMemo(() => moverSet(data.stocks), [data])
  const shown = useMemo(() => [...movers.top, ...movers.bottom], [movers])

  const geometry = useMemo(() => {
    const position = new Map(dates.map((date, index) => [date, index]))
    const values = [...data.points, ...shown.flatMap((stock) => stock.points)].map((point) => point.value)
    const axis = niceAxis(Math.min(0, ...values), Math.max(0, ...values), AXIS_STEPS)
    const last = Math.max(dates.length - 1, 1)
    const x = (index: number) => (index / last) * VIEW_W
    const y = (value: number) => ((axis.hi - value) / (axis.hi - axis.lo || 1)) * VIEW_H
    const path = (points: readonly ReturnPointRes[]) =>
      points
        .map((point, k) => `${k === 0 ? 'M' : 'L'}${x(position.get(point.date) ?? 0).toFixed(1)},${y(point.value).toFixed(1)}`)
        .join('')
    return {
      axis,
      last,
      x,
      y,
      grid: axis.ticks.map((value) => `M0,${y(value).toFixed(1)}H${VIEW_W}`).join(''),
      zero: `M0,${y(0).toFixed(1)}H${VIEW_W}`,
      basket: path(data.points),
      members: shown.map((stock) => ({ ticker: stock.ticker, d: path(stock.points) })),
    }
  }, [data, dates, shown])

  const total = data.total
  const tone = toneOf(total)
  const year = Number(dates[dates.length - 1].slice(0, 4))
  const ticks = returnTicks(dates, period)
  const day = hover === null ? null : dates[hover]
  const basketNow = day === null ? total : (data.points[hover ?? 0]?.value ?? null)
  const counted = day === null ? data.stocks.length : data.stocks.filter((stock) => valueOn(stock.points, day) !== null).length
  const lead = data.stocks[0]
  const end = data.points[data.points.length - 1]?.value ?? null
  const valueOf = (stock: MemberReturnRes) => (day === null ? stock.total : valueOn(stock.points, day))
  const valueMax = Math.max(0, ...data.stocks.map((stock) => Math.abs(valueOf(stock) ?? 0)))
  const tagAt = hover === null ? 0 : hover / geometry.last
  const weak = data.stocks[data.stocks.length - 1]

  const track = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0
    setHover(Math.min(dates.length - 1, Math.max(0, Math.round(ratio * (dates.length - 1)))))
  }

  const lineState = (ticker: string) => (focus === null ? undefined : focus === ticker ? 'is-on' : 'is-dim')

  const row = (stock: MemberReturnRes) => {
    const value = valueOf(stock)
    const part = value === null || counted === 0 ? null : value / counted
    const clear = () => setFocus(null)
    return (
      <li key={stock.ticker}>
        <Link
          to={stockPath(stock.ticker)}
          state={state}
          className="fg-mine__mover"
          data-on={focus === stock.ticker ? 'true' : undefined}
          onMouseEnter={() => setFocus(stock.ticker)}
          onFocus={() => setFocus(stock.ticker)}
          onMouseLeave={clear}
          onBlur={clear}
        >
          <CompanyLogo name={stock.name} ticker={stock.ticker} size={20} />
          <span className="fg-mine__movername">{stock.name}</span>
          <b className={cn('fg-mine__moverchg fg-num', toneClass(value))}>{value === null ? '–' : formatChange(value)}</b>
          <span className="fg-mine__moverpart fg-num">
            {part === null ? '' : `기여 ${formatChange(part)}p`}
            {value !== null && valueMax > 0 && (
              <ShareBar value={Math.abs(value) / valueMax} tone={value >= 0 ? 'up' : 'down'} className="fg-mine__partbar" />
            )}
          </span>
        </Link>
      </li>
    )
  }

  const aria = [
    `${name} ${PERIOD_WORD[period]} 수익률 ${total === null ? '없음' : formatChange(total)}`,
    lead?.total != null ? `가장 많이 오른 종목 ${lead.name} ${formatChange(lead.total)}` : null,
    weak && weak !== lead && weak.total != null ? `가장 약한 종목 ${weak.name} ${formatChange(weak.total)}` : null,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <>
      <div className="fg-mine__chartcap fg-num">
        <span>{`${monthDayLabel(dates[0], year)} 종가 대비`}</span>
        <span>
          {day === null ? `${name} ${PERIOD_WORD[period]} ` : `${monthDayLabel(day, year)} ${name} `}
          <b className={toneClass(basketNow)}>{basketNow === null ? '–' : formatChange(basketNow)}</b>
        </span>
      </div>
      <div className="fg-mine__chartbody">
        <div className="fg-mine__charty fg-num" aria-hidden="true">
          {geometry.axis.ticks.map((value) => (
            <span key={value} style={{ top: `${((geometry.y(value) / VIEW_H) * 100).toFixed(2)}%` }}>
              {formatAxisPercent(value)}
            </span>
          ))}
        </div>
        <div className="fg-mine__chartplot" onPointerMove={track} onPointerDown={track} onPointerLeave={() => setHover(null)}>
          <div className="fg-mine__chartarea">
            <svg className="fg-mine__chartsvg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" role="img" aria-label={aria}>
              <path className="fg-mine__chartgrid" d={geometry.grid} vectorEffect="non-scaling-stroke" />
              <path className="fg-mine__chartzero" d={geometry.zero} vectorEffect="non-scaling-stroke" />
              {geometry.members.map((member) => (
                <path
                  key={member.ticker}
                  className={cn('fg-mine__chartmember', lineState(member.ticker))}
                  d={member.d}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path className={cn('fg-mine__chartline', `fg-mine__chartline--${tone}`)} d={geometry.basket} vectorEffect="non-scaling-stroke" />
              {hover !== null && (
                <path
                  className="fg-mine__chartcross"
                  d={`M${geometry.x(hover).toFixed(1)},0V${VIEW_H}`}
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
            {hover !== null && basketNow !== null && (
              <span
                className={cn('fg-mine__chartdot', `fg-mine__chartdot--${tone}`)}
                style={{
                  left: `${((geometry.x(hover) / VIEW_W) * 100).toFixed(2)}%`,
                  top: `${((geometry.y(basketNow) / VIEW_H) * 100).toFixed(2)}%`,
                }}
                aria-hidden="true"
              />
            )}
            {hover === null && end !== null && (
              <span
                className={cn('fg-mine__chartdot', `fg-mine__chartdot--${tone}`, 'fg-mine__chartdot--end')}
                style={{ left: '100%', top: `${((geometry.y(end) / VIEW_H) * 100).toFixed(2)}%` }}
                aria-hidden="true"
              />
            )}
            {hover !== null && basketNow !== null && (
              <span
                className="fg-mine__charttag fg-num"
                data-edge={tagAt < 0.12 ? 'start' : tagAt > 0.88 ? 'end' : undefined}
                style={{ left: `${(tagAt * 100).toFixed(2)}%` }}
                aria-hidden="true"
              >
                {formatChange(basketNow)}
              </span>
            )}
          </div>
          <div className="fg-mine__chartx fg-num" aria-hidden="true">
            {ticks.map((tick) => (
              <span
                key={tick.index}
                data-edge={tick.index === 0 ? 'start' : tick.index === dates.length - 1 ? 'end' : undefined}
                style={{ left: `${((tick.index / geometry.last) * 100).toFixed(2)}%` }}
              >
                {tick.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="fg-mine__movers">
        <p className="fg-mine__movershead fg-num">
          <span>{day === null ? '종목별 수익률' : `종목별 수익률 · ${monthDayLabel(day, year)}`}</span>
          <span>{movers.hidden > 0 ? `가운데 ${movers.hidden}개는 줄였어요` : `${data.stocks.length}개`}</span>
        </p>
        {movers.hidden > 0 ? (
          <div className="fg-mine__movercols">
            <div>
              <p className="fg-mine__moversub">{`수익률 상위 ${movers.top.length}개`}</p>
              <ol className="fg-mine__moverlist">{movers.top.map(row)}</ol>
            </div>
            <div>
              <p className="fg-mine__moversub">{`수익률 하위 ${movers.bottom.length}개`}</p>
              <ol className="fg-mine__moverlist">{movers.bottom.map(row)}</ol>
            </div>
          </div>
        ) : (
          <ol className="fg-mine__moverlist fg-mine__moverlist--grid">{movers.top.map(row)}</ol>
        )}
      </div>

      <span className="fg-mine__chartfoot fg-num">
        <span className="fg-mine__chartkey">
          <span className={cn('fg-mine__chartswatch', `fg-mine__chartswatch--${tone}`)} aria-hidden="true" />
          {name} <b className={toneClass(total)}>{total === null ? '–' : formatChange(total)}</b>
        </span>
        <span>
          {monthDayLabel(dates[0], year)} ~ {monthDayLabel(dates[dates.length - 1], year)}
        </span>
        <span>{`${scope} ${data.stockCount}개를 같은 비중으로 묶어 계산 · 기여는 종목 수익률을 종목 수로 나눈 값`}</span>
      </span>
    </>
  )
}
