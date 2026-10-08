import { ChevronRight } from 'lucide-react'
import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  HistogramSeries,
  LineStyle,
  TickMarkType,
  type IChartApi,
  type ISeriesApi,
  type LogicalRange,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/fg/Button'
import { IssueMarkerLayer, type MarkerSpot } from '@/components/fg/IssueMarkerLayer'
import { Segment } from '@/components/fg/SegmentedTabs'
import { Skeleton } from '@/components/fg/Skeleton'
import type { CandlePeriod, CandleRes } from '@/lib/apiTypes'
import { formatChange } from '@/lib/format'
import { toneClass } from '@/lib/fg/format'
import {
  CANDLE_KIND_OPTIONS,
  chartSearch,
  chartValueText,
  DAILY_HISTORY_LIMIT,
  DEEP_LOAD_EDGE,
  followSpan,
  formatChartPrice,
  isAway,
  isoOfTime,
  keyboardIndex,
  kindLabel,
  legendAt,
  needsDailyHistory,
  parseChartKind,
  parseChartRange,
  RANGE_OPTIONS,
  rangeSpan,
  RIGHT_OFFSET,
  shiftSpan,
  spanMoved,
  tickLabel,
  withAlpha,
  WON_FORMAT,
  zoomSpan,
  type LogicalSpan,
  type PriceFormat,
} from '@/lib/fg/priceChart'
import { dayLabel } from '@/lib/fg/themeCharts'
import { useSourceCandles, type CandleSource } from '@/lib/queries/useCandles'
import { cn } from '@/lib/utils'

export interface ChartMarker {
  key: string
  index: number
  stack: number
  title: string
}

interface PriceChartProps {
  name: string
  source: CandleSource
  title?: string | null
  format?: PriceFormat
  candles: readonly CandleRes[]
  markers: readonly ChartMarker[] | null
  markerLabel: string
  showMarkers: boolean
  onToggleMarkers: () => void
  selected: string | null
  onSelect: (key: string) => void
  callout: ReactNode
}

interface Mounted {
  chart: IChartApi
  candle: ISeriesApi<'Candlestick'>
  volume: ISeriesApi<'Histogram'>
  layer: IssueMarkerLayer
  colors: { up: string; down: string }
}

const NO_RANGE = 'none'
type RangeChoice = string

const WEEKLY_CANDLE_LIMIT = 160
const MONTHLY_CANDLE_LIMIT = 60

function tokens() {
  const style = getComputedStyle(document.documentElement)
  const read = (name: string) => style.getPropertyValue(name).trim()
  return {
    up: read('--market-up'),
    down: read('--market-down'),
    event: read('--relation-event'),
    surface: read('--bg-surface'),
    grid: read('--border-divider'),
    text1: read('--text-primary'),
    text2: read('--text-secondary'),
    text3: read('--text-tertiary'),
    font: read('--font-sans'),
  }
}

function tickKind(type: TickMarkType): 'year' | 'month' | 'day' {
  if (type === TickMarkType.Year) return 'year'
  if (type === TickMarkType.Month) return 'month'
  return 'day'
}

function toSpan(range: LogicalRange): LogicalSpan {
  return { from: range.from, to: range.to }
}

interface TooltipPoint {
  x: number
  y: number
}

function placeTooltip(
  point: TooltipPoint,
  size: { width: number; height: number },
  bounds: { width: number; height: number },
  gap = 12,
): { left: number; top: number } {
  const left = point.x + gap + size.width > bounds.width ? point.x - gap - size.width : point.x + gap
  const top = point.y + gap + size.height > bounds.height ? point.y - gap - size.height : point.y + gap
  return { left: Math.max(0, left), top: Math.max(0, top) }
}

function showTooltip(el: HTMLDivElement | null, host: HTMLDivElement, point: TooltipPoint): void {
  if (!el) return
  const { left, top } = placeTooltip(
    point,
    { width: el.offsetWidth, height: el.offsetHeight },
    { width: host.clientWidth, height: host.clientHeight },
  )
  el.style.left = `${left}px`
  el.style.top = `${top}px`
  el.style.opacity = '1'
}

function hideTooltip(el: HTMLDivElement | null): void {
  if (el) el.style.opacity = '0'
}

function showRange(
  view: Mounted | null,
  candles: readonly CandleRes[],
  kind: CandlePeriod,
  range: string,
  expected: RefObject<LogicalSpan | null>,
): void {
  if (!view) return
  const timeScale = view.chart.timeScale()
  expected.current = null
  timeScale.setVisibleLogicalRange(rangeSpan(candles.map((c) => c.date), kind, range))
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const visible = timeScale.getVisibleLogicalRange()
      expected.current = visible ? toSpan(visible) : null
    }),
  )
}

export function PriceChart({
  name,
  source,
  title = '주가',
  format = WON_FORMAT,
  candles,
  markers,
  markerLabel,
  showMarkers,
  onToggleMarkers,
  selected,
  onSelect,
  callout,
}: PriceChartProps) {
  const hintId = useId()
  const hostRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const mounted = useRef<Mounted | null>(null)
  const expected = useRef<LogicalSpan | null>(null)
  const { pathname, search, state } = useLocation()
  const navigate = useNavigate()
  const kind = parseChartKind(search)
  const [deep, setDeep] = useState(() => kind === 'D' && needsDailyHistory(parseChartRange(search, 'D')))
  const history = useSourceCandles(kind === 'D' && deep ? source : null, 'D', DAILY_HISTORY_LIMIT)
  const weekly = useSourceCandles(kind === 'W' ? source : null, 'W', WEEKLY_CANDLE_LIMIT)
  const monthly = useSourceCandles(kind === 'M' ? source : null, 'M', MONTHLY_CANDLE_LIMIT)
  const formatRef = useRef(format)
  const daily = deep && history.data && history.data.length > candles.length ? history.data : candles
  const displayCandles = kind === 'D' ? daily : kind === 'W' ? weekly.data : monthly.data
  const dailyIndex = useMemo(() => new Map(daily.map((candle, index) => [candle.date, index])), [daily])
  const kindRef = useRef(kind)
  useEffect(() => {
    kindRef.current = kind
  }, [kind])
  const shown = displayCandles ?? []
  const [active, setActive] = useState<{ kind: CandlePeriod; range: string } | null>(() => ({
    kind,
    range: parseChartRange(search, kind),
  }))
  const activeRef = useRef(active)
  useEffect(() => {
    activeRef.current = active
  })
  const historyWanted = kind === 'D' && active?.kind === 'D' && needsDailyHistory(active.range)
  const loading =
    (kind !== 'D' &&
      (kindRef.current !== kind ||
        (kind === 'W' ? weekly.data === null || weekly.loading : monthly.data === null || monthly.loading))) ||
    (historyWanted && history.data === null && history.error === null)
  const deepen = () => setDeep(true)
  const latest = useRef({ candles: shown, markers, onSelect, refYear: 0, kind, deepen })
  const [hover, setHover] = useState<number | null>(null)
  const [kb, setKb] = useState<number | null>(null)
  const [away, setAway] = useState(false)
  const count = shown.length
  const refYear = count > 0 ? Number(shown[count - 1].date.slice(0, 4)) : 0

  useEffect(() => {
    latest.current = { candles: shown, markers, onSelect, refYear, kind, deepen }
  })

  useEffect(() => {
    setKb(null)
    setHover(null)
  }, [kind])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const t = tokens()
    const chart = createChart(host, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: t.surface },
        textColor: t.text2,
        fontSize: 12,
        fontFamily: t.font,
        attributionLogo: false,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: t.grid } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: t.text3, width: 1, style: LineStyle.Dashed, labelBackgroundColor: t.text1 },
        horzLine: { color: t.text3, width: 1, style: LineStyle.Dashed, labelBackgroundColor: t.text1 },
      },
      handleScroll: { vertTouchDrag: false },
      rightPriceScale: { borderVisible: false, entireTextOnly: true, scaleMargins: { top: 0.12, bottom: 0.24 } },
      timeScale: {
        borderVisible: false,
        rightOffset: RIGHT_OFFSET,
        barSpacing: 10,
        minBarSpacing: 2,
        fixLeftEdge: true,
        lockVisibleTimeRangeOnResize: true,
        tickMarkFormatter: (time: Time, type: TickMarkType) => tickLabel(isoOfTime(time), tickKind(type)),
      },
      localization: {
        locale: 'ko-KR',
        priceFormatter: (price: number) => formatChartPrice(price, formatRef.current.decimals),
        timeFormatter: (time: Time) => dayLabel(isoOfTime(time), latest.current.refYear),
      },
    })
    const candle = chart.addSeries(CandlestickSeries, {
      upColor: t.up,
      downColor: t.down,
      borderVisible: false,
      wickUpColor: t.up,
      wickDownColor: t.down,
      priceFormat: {
        type: 'price',
        precision: formatRef.current.decimals,
        minMove: 10 ** -formatRef.current.decimals,
      },
    })
    const volume = chart.addSeries(HistogramSeries, {
      priceScaleId: 'vol',
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    })
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
    const layer = new IssueMarkerLayer({ event: t.event, surface: t.surface })
    candle.attachPrimitive(layer)
    mounted.current = { chart, candle, volume, layer, colors: { up: t.up, down: t.down } }

    const onMove = (param: MouseEventParams<Time>) => {
      const total = latest.current.candles.length
      const index =
        param.time !== undefined && param.logical !== undefined
          ? Math.max(0, Math.min(total - 1, Math.round(param.logical)))
          : null
      setHover(index)
      const hovered = latest.current.kind === 'D' && param.point ? layer.find(param.point.x, param.point.y) : null
      if (hovered !== layer.hovered) layer.set({ hovered })
      if (param.sourceEvent !== undefined && index !== null && param.point) {
        showTooltip(tooltipRef.current, host, param.point)
      } else {
        hideTooltip(tooltipRef.current)
      }
    }
    const onClick = (param: MouseEventParams<Time>) => {
      if (latest.current.kind !== 'D') return
      const id = param.hoveredInfo?.objectId
      const known = typeof id === 'string' && latest.current.markers?.some((marker) => marker.key === id) ? id : null
      const picked = known ?? (param.point ? layer.find(param.point.x, param.point.y) : null)
      if (picked) latest.current.onSelect(picked)
    }
    const onRange = (range: LogicalRange | null) => {
      if (!range) return
      const span = toSpan(range)
      setAway(isAway(span, latest.current.candles.length))
      const want = expected.current
      if (want && spanMoved(want, span)) {
        expected.current = null
        setActive(null)
      }
      if (latest.current.kind === 'D' && activeRef.current === null && span.from < DEEP_LOAD_EDGE) {
        latest.current.deepen()
      }
    }
    chart.subscribeCrosshairMove(onMove)
    chart.subscribeClick(onClick)
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRange)
    let alive = true
    document.fonts.ready.then(() => {
      if (alive) chart.applyOptions({ layout: { fontFamily: t.font } })
    })
    return () => {
      alive = false
      chart.unsubscribeCrosshairMove(onMove)
      chart.unsubscribeClick(onClick)
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange)
      chart.remove()
      mounted.current = null
    }
  }, [])

  const drawn = useRef<{ kind: CandlePeriod; count: number } | null>(null)
  useEffect(() => {
    const view = mounted.current
    if (!view || displayCandles === null) return
    const before = view.chart.timeScale().getVisibleLogicalRange()
    const previous = drawn.current
    const grown = previous && previous.kind === kind ? displayCandles.length - previous.count : 0
    drawn.current = { kind, count: displayCandles.length }
    const { up, down } = view.colors
    view.candle.setData(
      displayCandles.map((c) => ({ time: c.date, open: c.open, high: c.high, low: c.low, close: c.close })),
    )
    view.volume.setData(
      displayCandles.map((c) => ({ time: c.date, value: c.volume, color: withAlpha(c.close >= c.open ? up : down, 0.32) })),
    )
    const want = activeRef.current
    if (want && want.kind === kind) showRange(view, displayCandles, kind, want.range, expected)
    else if (grown > 0 && before) view.chart.timeScale().setVisibleLogicalRange(shiftSpan(toSpan(before), grown))
  }, [displayCandles, kind])

  useEffect(() => {
    const view = mounted.current
    if (!view) return
    const spots: MarkerSpot[] =
      kind === 'D'
        ? (markers ?? []).flatMap((marker) => {
            const candle = candles[marker.index]
            return candle ? [{ key: marker.key, time: candle.date, high: candle.high, stack: marker.stack }] : []
          })
        : []
    view.layer.set({
      spots,
      visible: kind === 'D' && showMarkers && markers !== null,
      selected: kind === 'D' && showMarkers ? selected : null,
    })
  }, [markers, candles, showMarkers, selected, kind])

  const revealed = useRef(selected)
  useEffect(() => {
    if (revealed.current === selected) return
    revealed.current = selected
    const view = mounted.current
    const target = markers?.find((marker) => marker.key === selected)
    if (!view || !target || !showMarkers || kind !== 'D') return
    const timeScale = view.chart.timeScale()
    const range = timeScale.getVisibleLogicalRange()
    const index = dailyIndex.get(candles[target.index]?.date ?? '') ?? target.index
    const next = range ? followSpan(toSpan(range), index) : null
    if (next) timeScale.setVisibleLogicalRange(next)
  }, [selected, markers, showMarkers, kind, dailyIndex, candles])

  const pickKind = (next: CandlePeriod) => {
    if (next === kind) return
    const nextRange = parseChartRange(search, next)
    setActive({ kind: next, range: nextRange })
    if (next === 'D' && needsDailyHistory(nextRange)) setDeep(true)
    expected.current = null
    navigate({ pathname, search: chartSearch(search, next, nextRange) }, { replace: true, state })
    const source = next === 'D' ? daily : next === 'W' ? weekly.data : monthly.data
    if (source) showRange(mounted.current, source, next, nextRange, expected)
  }

  const pickRange = (next: RangeChoice) => {
    if (next === NO_RANGE) return
    setActive({ kind, range: next })
    if (kind === 'D' && needsDailyHistory(next)) setDeep(true)
    navigate({ pathname, search: chartSearch(search, kind, next) }, { replace: true, state })
    if (displayCandles) showRange(mounted.current, displayCandles, kind, next, expected)
  }

  const markerAt = (index: number) =>
    kind === 'D' ? (markers?.find((marker) => dailyIndex.get(candles[marker.index]?.date ?? '') === index) ?? null) : null

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const view = mounted.current
    if (!view || count === 0) return
    const timeScale = view.chart.timeScale()
    const range = timeScale.getVisibleLogicalRange()
    const key = event.key
    if (key === '+' || key === '=' || key === '-' || key === '_') {
      event.preventDefault()
      if (!range) return
      const factor = key === '+' || key === '=' ? 0.8 : 1.25
      timeScale.setVisibleLogicalRange(zoomSpan(toSpan(range), kb ?? range.to, factor))
      return
    }
    if (key === 'Escape') {
      view.chart.clearCrosshairPosition()
      setKb(null)
      setHover(null)
      hideTooltip(tooltipRef.current)
      return
    }
    if (key === 'Enter' || key === ' ') {
      if (kb === null) return
      event.preventDefault()
      const marker = showMarkers ? markerAt(kb) : null
      if (marker) onSelect(marker.key)
      return
    }
    const index = keyboardIndex(key, event.shiftKey, kb, count)
    if (index === null) return
    event.preventDefault()
    const next = range ? followSpan(toSpan(range), index) : null
    if (next) timeScale.setVisibleLogicalRange(next)
    view.chart.setCrosshairPosition(shown[index].close, shown[index].date, view.candle)
    setKb(index)
    setHover(index)
  }

  const shownIndex = hover ?? kb ?? count - 1
  const legend = legendAt(shown, shownIndex, kind, format.decimals)
  const kbIndex = kb ?? count - 1
  const kbMarker = showMarkers ? markerAt(kbIndex) : null
  const rangeOptions = RANGE_OPTIONS[kind].map(({ value, label }) => ({ value, label }))
  const rangeValue = active && active.kind === kind ? active.range : NO_RANGE

  return (
    <section
      className={cn('fg-pc', title === null ? 'fg-pc--bare' : 'fg-section')}
      aria-labelledby={title === null ? undefined : 'fg-pc-title'}
      aria-label={title === null ? `${name} 차트` : undefined}
    >
      <div className="fg-pc__bar">
        {title !== null && (
          <h2 id="fg-pc-title" className="fg-section__title">
            {title}
          </h2>
        )}
        <div className="fg-pc__tools">
          {markers !== null && (
            <button
              type="button"
              className="fg-pc__toggle"
              aria-pressed={kind === 'D' && showMarkers}
              disabled={kind !== 'D'}
              onClick={kind === 'D' ? onToggleMarkers : undefined}
            >
              <i className="fg-dia" aria-hidden="true" />
              {kind === 'D' ? `${markerLabel} 표시` : `${markerLabel} 표시는 일봉에서 볼 수 있어요`}
            </button>
          )}
          <Segment<CandlePeriod> label="캔들 종류" options={CANDLE_KIND_OPTIONS} value={kind} onChange={pickKind} />
          <Segment<RangeChoice> label="기간" options={rangeOptions} value={rangeValue} onChange={pickRange} />
        </div>
      </div>
      <div className="fg-pc__legend" aria-hidden="true">
        {legend && (
          <>
            <b>{legend.date}</b>
            <span>
              시 <b>{legend.open}</b>
            </span>
            <span>
              고 <b>{legend.high}</b>
            </span>
            <span>
              저 <b>{legend.low}</b>
            </span>
            <span>
              종 <b>{legend.close}</b>
            </span>
            {legend.change !== null && (
              <span className={cn('fg-pc__chg', toneClass(legend.change))}>{formatChange(legend.change)}</span>
            )}
            <span>
              거래량 <b>{legend.volume}</b>
            </span>
          </>
        )}
      </div>
      <div
        className="fg-pc__lw"
        role="slider"
        tabIndex={0}
        aria-label={`${name} ${kindLabel(kind)} 차트`}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, count - 1)}
        aria-valuenow={Math.max(0, kbIndex)}
        aria-valuetext={chartValueText(shown, kbIndex, kbMarker?.title ?? null, markerLabel, kind, format)}
        aria-describedby={hintId}
        onKeyDown={onKeyDown}
      >
        <div ref={hostRef} className="fg-pc__host" />
        {loading && (
          <div className="fg-pc__loading">
            <Skeleton height="100%" />
          </div>
        )}
        <div ref={tooltipRef} className="fg-pc__tip" aria-hidden="true">
          {legend && (
            <>
              <b className="fg-pc__tip-date">{legend.date}</b>
              <dl className="fg-pc__tip-grid">
                <dt>시가</dt>
                <dd>{legend.open}</dd>
                <dt>고가</dt>
                <dd>{legend.high}</dd>
                <dt>저가</dt>
                <dd>{legend.low}</dd>
                <dt>종가</dt>
                <dd>{legend.close}</dd>
                {legend.change !== null && (
                  <>
                    <dt>등락률</dt>
                    <dd className={toneClass(legend.change)}>{formatChange(legend.change)}</dd>
                  </>
                )}
                <dt>거래량</dt>
                <dd>{legend.volume}</dd>
              </dl>
            </>
          )}
        </div>
        {away && (
          <Button
            size="sm"
            className="fg-pc__now"
            onClick={() => mounted.current?.chart.timeScale().scrollToRealTime()}
          >
            최근으로
            <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        )}
      </div>
      {showMarkers && kind === 'D' && callout}
      <p id={hintId} className="fg-pc__hint">
        {markers !== null && kind === 'D' && (
          <span>
            <i className="fg-dia" aria-hidden="true" />
            {markerLabel === '이슈' ? '이슈가 처음 보도된 날' : '뉴스가 나온 날'}
          </span>
        )}
        <span>휠로 확대 · 끌어서 이동 · 키보드 ← → 와 + −</span>
      </p>
    </section>
  )
}
