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
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { Button } from '@/components/fg/Button'
import { IssueMarkerLayer, type MarkerSpot } from '@/components/fg/IssueMarkerLayer'
import { Segment } from '@/components/fg/SegmentedTabs'
import type { CandleRes } from '@/lib/apiTypes'
import { formatChange } from '@/lib/format'
import { toneClass } from '@/lib/fg/format'
import {
  chartValueText,
  DEFAULT_PRICE_PERIOD,
  followSpan,
  formatChartPrice,
  isAway,
  isoOfTime,
  keyboardIndex,
  legendAt,
  periodSpan,
  PRICE_PERIODS,
  revealSpan,
  RIGHT_OFFSET,
  spanMoved,
  tickLabel,
  withAlpha,
  zoomSpan,
  type LogicalSpan,
  type PricePeriod,
} from '@/lib/fg/priceChart'
import { dayLabel } from '@/lib/fg/themeCharts'
import { cn } from '@/lib/utils'

export interface ChartMarker {
  key: string
  index: number
  stack: number
  title: string
}

interface PriceChartProps {
  name: string
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

const NO_PERIOD = 'none'
type PeriodChoice = PricePeriod | typeof NO_PERIOD

const PERIOD_OPTIONS = PRICE_PERIODS.map(({ value, label }) => ({ value, label }))

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

function showPeriod(
  view: Mounted | null,
  candles: readonly CandleRes[],
  period: PricePeriod,
  expected: RefObject<LogicalSpan | null>,
): void {
  if (!view) return
  const timeScale = view.chart.timeScale()
  expected.current = null
  timeScale.setVisibleLogicalRange(periodSpan(candles.map((c) => c.date), period))
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const range = timeScale.getVisibleLogicalRange()
      expected.current = range ? toSpan(range) : null
    }),
  )
}

export function PriceChart({
  name,
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
  const latest = useRef({ candles, markers, onSelect, refYear: 0 })
  const [period, setPeriod] = useState<PricePeriod | null>(DEFAULT_PRICE_PERIOD)
  const [hover, setHover] = useState<number | null>(null)
  const [kb, setKb] = useState<number | null>(null)
  const [away, setAway] = useState(false)
  const count = candles.length
  const refYear = count > 0 ? Number(candles[count - 1].date.slice(0, 4)) : 0

  useEffect(() => {
    latest.current = { candles, markers, onSelect, refYear }
  })

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
        priceFormatter: (price: number) => formatChartPrice(price),
        timeFormatter: (time: Time) => dayLabel(isoOfTime(time), latest.current.refYear),
      },
    })
    const candle = chart.addSeries(CandlestickSeries, {
      upColor: t.up,
      downColor: t.down,
      borderVisible: false,
      wickUpColor: t.up,
      wickDownColor: t.down,
      priceFormat: { type: 'price', precision: 0, minMove: 1 },
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
      const hovered = param.point ? layer.find(param.point.x, param.point.y) : null
      if (hovered !== layer.hovered) layer.set({ hovered })
      if (param.sourceEvent !== undefined && index !== null && param.point) {
        showTooltip(tooltipRef.current, host, param.point)
      } else {
        hideTooltip(tooltipRef.current)
      }
    }
    const onClick = (param: MouseEventParams<Time>) => {
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
        setPeriod(null)
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

  const periodRef = useRef(period)
  useEffect(() => {
    periodRef.current = period
  })

  useEffect(() => {
    const view = mounted.current
    if (!view) return
    const { up, down } = view.colors
    view.candle.setData(candles.map((c) => ({ time: c.date, open: c.open, high: c.high, low: c.low, close: c.close })))
    view.volume.setData(
      candles.map((c) => ({ time: c.date, value: c.volume, color: withAlpha(c.close >= c.open ? up : down, 0.32) })),
    )
    if (periodRef.current) showPeriod(view, candles, periodRef.current, expected)
  }, [candles])

  useEffect(() => {
    const view = mounted.current
    if (!view) return
    const spots: MarkerSpot[] = (markers ?? []).flatMap((marker) => {
      const candle = candles[marker.index]
      return candle ? [{ key: marker.key, time: candle.date, high: candle.high, stack: marker.stack }] : []
    })
    view.layer.set({ spots, visible: showMarkers && markers !== null, selected: showMarkers ? selected : null })
  }, [markers, candles, showMarkers, selected])

  const revealed = useRef(selected)
  useEffect(() => {
    if (revealed.current === selected) return
    revealed.current = selected
    const view = mounted.current
    const target = markers?.find((marker) => marker.key === selected)
    if (!view || !target || !showMarkers) return
    const timeScale = view.chart.timeScale()
    const range = timeScale.getVisibleLogicalRange()
    const next = range ? revealSpan(toSpan(range), target.index) : null
    if (next) timeScale.setVisibleLogicalRange(next)
  }, [selected, markers, showMarkers])

  const pickPeriod = (next: PeriodChoice) => {
    if (next === NO_PERIOD) return
    setPeriod(next)
    showPeriod(mounted.current, candles, next, expected)
  }

  const markerAt = (index: number) => markers?.find((marker) => marker.index === index) ?? null

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
    view.chart.setCrosshairPosition(candles[index].close, candles[index].date, view.candle)
    setKb(index)
    setHover(index)
  }

  const shown = hover ?? kb ?? count - 1
  const legend = legendAt(candles, shown)
  const kbIndex = kb ?? count - 1
  const kbMarker = showMarkers ? markerAt(kbIndex) : null

  return (
    <section className="fg-section fg-pc" aria-labelledby="fg-pc-title">
      <div className="fg-pc__bar">
        <h2 id="fg-pc-title" className="fg-section__title">
          주가
        </h2>
        <div className="fg-pc__tools">
          {markers !== null && (
            <button type="button" className="fg-pc__toggle" aria-pressed={showMarkers} onClick={onToggleMarkers}>
              <i className="fg-dia" aria-hidden="true" />
              {markerLabel} 표시
            </button>
          )}
          <Segment<PeriodChoice>
            label="기간"
            options={PERIOD_OPTIONS}
            value={period ?? NO_PERIOD}
            onChange={pickPeriod}
          />
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
        aria-label={`${name} 일봉 차트`}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, count - 1)}
        aria-valuenow={Math.max(0, kbIndex)}
        aria-valuetext={chartValueText(candles, kbIndex, kbMarker?.title ?? null, markerLabel)}
        aria-describedby={hintId}
        onKeyDown={onKeyDown}
      >
        <div ref={hostRef} className="fg-pc__host" />
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
      {showMarkers && callout}
      <p id={hintId} className="fg-pc__hint">
        {markers !== null && (
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
