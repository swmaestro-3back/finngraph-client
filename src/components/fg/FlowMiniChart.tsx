import {
  AreaSeries,
  ColorType,
  createChart,
  CrosshairMode,
  LineStyle,
  TickMarkType,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import { IssueMarkerLayer } from '@/components/fg/IssueMarkerLayer'
import type { CandleRes } from '@/lib/apiTypes'
import { formatChartPrice, isoOfTime, withAlpha } from '@/lib/fg/priceChart'
import { dayLabel } from '@/lib/fg/themeCharts'

export interface FlowMark {
  key: string
  date: string
  close: number
}

interface FlowMiniChartProps {
  candles: readonly CandleRes[]
  marks: readonly FlowMark[]
  change: number | null
  label: string
}

interface Mounted {
  chart: IChartApi
  series: ISeriesApi<'Area'>
  layer: IssueMarkerLayer
  colors: { up: string; down: string; flat: string }
}

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

function tickText(time: Time, type: TickMarkType): string {
  const [, m, d] = isoOfTime(time).split('-').map(Number)
  return type === TickMarkType.Year || type === TickMarkType.Month ? `${m}월` : String(d)
}

export function FlowMiniChart({ candles, marks, change, label }: FlowMiniChartProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mounted = useRef<Mounted | null>(null)
  const refYear = useRef(0)

  useEffect(() => {
    refYear.current = candles.length > 0 ? Number(candles[candles.length - 1].date.slice(0, 4)) : 0
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
        mode: CrosshairMode.Magnet,
        vertLine: { color: t.text3, width: 1, style: LineStyle.Dashed, labelBackgroundColor: t.text1 },
        horzLine: { visible: false, labelVisible: false },
      },
      handleScroll: false,
      handleScale: false,
      rightPriceScale: { borderVisible: false, entireTextOnly: true, scaleMargins: { top: 0.22, bottom: 0.08 } },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true, tickMarkFormatter: tickText },
      localization: {
        locale: 'ko-KR',
        priceFormatter: (price: number) => formatChartPrice(price),
        timeFormatter: (time: Time) => dayLabel(isoOfTime(time), refYear.current),
      },
    })
    const series = chart.addSeries(AreaSeries, {
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: { type: 'price', precision: 0, minMove: 1 },
    })
    const layer = new IssueMarkerLayer({ event: t.event, surface: t.surface })
    series.attachPrimitive(layer)
    mounted.current = { chart, series, layer, colors: { up: t.up, down: t.down, flat: t.text3 } }
    let alive = true
    document.fonts.ready.then(() => {
      if (alive) chart.applyOptions({ layout: { fontFamily: t.font } })
    })
    return () => {
      alive = false
      chart.remove()
      mounted.current = null
    }
  }, [])

  useEffect(() => {
    const view = mounted.current
    if (!view) return
    const { up, down, flat } = view.colors
    const color = change === null || change === 0 ? flat : change > 0 ? up : down
    view.series.applyOptions({ lineColor: color, topColor: withAlpha(color, 0.16), bottomColor: withAlpha(color, 0) })
    view.series.setData(candles.map((c) => ({ time: c.date, value: c.close })))
    const seen = new Map<string, number>()
    const spots = marks.map((mark) => {
      const stack = seen.get(mark.date) ?? 0
      seen.set(mark.date, stack + 1)
      return { key: mark.key, time: mark.date, high: mark.close, stack }
    })
    view.layer.set({ spots })
    view.chart.timeScale().fitContent()
  }, [candles, marks, change])

  return (
    <div className="fg-sfd__chart" role="img" aria-label={label}>
      <div className="fg-sfd__host" ref={hostRef} />
    </div>
  )
}
