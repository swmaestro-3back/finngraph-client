import {
  BaselineSeries,
  ColorType,
  createChart,
  createTextWatermark,
  CrosshairMode,
  HistogramSeries,
  LineStyle,
  TickMarkType,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Segment } from '@/components/fg/SegmentedTabs'
import { formatChartPrice, isoOfTime, keyboardIndex, withAlpha } from '@/lib/fg/priceChart'
import { toneClass } from '@/lib/fg/format'
import {
  DEFAULT_FLOW_MODE,
  DEFAULT_FLOW_RANGE,
  flowChangeText,
  flowDateLabel,
  flowHelp,
  flowLead,
  flowRangeOptions,
  flowReading,
  flowTail,
  flowValueText,
  flowWindow,
  FLOW_MODES,
  foreignHolding,
  formatAxisShares,
  holdingText,
  INVESTORS,
  recentFlowRows,
  runningTotals,
  sharedScale,
  type FlowDay,
  type FlowMode,
  type FlowRange,
} from '@/lib/fg/investorFlows'
import { formatManShares } from '@/lib/fg/stockQuote'
import { dayLabel } from '@/lib/fg/themeCharts'
import type { SupplyStreaks } from '@/lib/supplyStreak'
import { cn } from '@/lib/utils'

export const FLOW_TITLE_ID = 'fg-sf-flow'

const MAN = 1e4

interface InvestorFlowChartProps {
  days: readonly FlowDay[]
  streaks: SupplyStreaks
}

interface PaneSeries {
  cum: ISeriesApi<'Baseline'>
  day: ISeriesApi<'Histogram'>
}

interface Mounted {
  chart: IChartApi
  panes: PaneSeries[]
  colors: { up: string; down: string }
}

function tokens() {
  const style = getComputedStyle(document.documentElement)
  const read = (name: string) => style.getPropertyValue(name).trim()
  return {
    up: read('--market-up'),
    down: read('--market-down'),
    surface: read('--bg-surface'),
    grid: read('--border-divider'),
    border: read('--border-default'),
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

export function InvestorFlowChart({ days, streaks }: InvestorFlowChartProps) {
  const helpId = useId()
  const daysId = useId()
  const hostRef = useRef<HTMLDivElement>(null)
  const mounted = useRef<Mounted | null>(null)
  const scaleRef = useRef({ lo: 0, hi: 0 })
  const pointing = useRef(false)
  const [mode, setMode] = useState<FlowMode>(DEFAULT_FLOW_MODE)
  const [range, setRange] = useState<FlowRange>(DEFAULT_FLOW_RANGE)
  const [hover, setHover] = useState<number | null>(null)
  const [kb, setKb] = useState<number | null>(null)

  const options = flowRangeOptions(days.length)
  const active = options.some((option) => option.value === range) ? range : options[options.length - 1].value
  const rows = useMemo(() => flowWindow(days, active), [days, active])
  const totals = useMemo(() => runningTotals(rows), [rows])
  const count = rows.length
  const refYear = count > 0 ? Number(rows[count - 1].date.slice(0, 4)) : 0
  const latest = useRef({ count, refYear })

  useEffect(() => {
    latest.current = { count, refYear }
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
        panes: { separatorColor: t.border, separatorHoverColor: t.border, enableResize: false },
      },
      grid: { vertLines: { visible: false }, horzLines: { color: t.grid } },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: t.text3, width: 1, style: LineStyle.Dashed, labelBackgroundColor: t.text1 },
        horzLine: { visible: false, labelVisible: false },
      },
      handleScroll: false,
      handleScale: false,
      rightPriceScale: { borderVisible: false, entireTextOnly: true },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true, tickMarkFormatter: tickText },
      localization: {
        locale: 'ko-KR',
        priceFormatter: (value: number) => formatAxisShares(value),
        timeFormatter: (time: Time) => dayLabel(isoOfTime(time), latest.current.refYear),
      },
    })
    const autoscale = () => ({ priceRange: { minValue: scaleRef.current.lo, maxValue: scaleRef.current.hi } })
    const priceFormat = { type: 'custom' as const, formatter: (value: number) => formatAxisShares(value), minMove: 0.1 }
    const panes = INVESTORS.map((_, pane) => {
      const cum = chart.addSeries(
        BaselineSeries,
        {
          baseValue: { type: 'price', price: 0 },
          lineWidth: 2,
          lastValueVisible: false,
          priceLineVisible: false,
          priceFormat,
          topLineColor: t.up,
          topFillColor1: withAlpha(t.up, 0.16),
          topFillColor2: withAlpha(t.up, 0.02),
          bottomLineColor: t.down,
          bottomFillColor1: withAlpha(t.down, 0.02),
          bottomFillColor2: withAlpha(t.down, 0.16),
          autoscaleInfoProvider: autoscale,
        },
        pane,
      )
      const day = chart.addSeries(
        HistogramSeries,
        { base: 0, lastValueVisible: false, priceLineVisible: false, priceFormat, visible: false, autoscaleInfoProvider: autoscale },
        pane,
      )
      for (const series of [cum, day])
        series.createPriceLine({ price: 0, color: t.border, lineWidth: 1, lineStyle: LineStyle.Solid, axisLabelVisible: false })
      cum.priceScale().applyOptions({ entireTextOnly: true, scaleMargins: { top: 0.22, bottom: 0.08 } })
      return { cum, day }
    })
    chart.panes().forEach((pane, i) => {
      pane.setStretchFactor(1)
      createTextWatermark(pane, {
        horzAlign: 'left',
        vertAlign: 'top',
        lines: [{ text: INVESTORS[i].label, color: t.text2, fontSize: 12, fontFamily: t.font, fontStyle: '600' }],
      })
    })
    mounted.current = { chart, panes, colors: { up: t.up, down: t.down } }

    const onMove = (param: MouseEventParams<Time>) => {
      if (pointing.current) return
      const total = latest.current.count
      const index =
        param.time !== undefined && param.logical !== undefined
          ? Math.max(0, Math.min(total - 1, Math.round(param.logical)))
          : null
      setHover(index)
    }
    chart.subscribeCrosshairMove(onMove)
    let alive = true
    document.fonts.ready.then(() => {
      if (alive) chart.applyOptions({ layout: { fontFamily: t.font } })
    })
    return () => {
      alive = false
      chart.unsubscribeCrosshairMove(onMove)
      chart.remove()
      mounted.current = null
    }
  }, [])

  useEffect(() => {
    const view = mounted.current
    if (!view) return
    const scale = sharedScale(rows, totals, mode)
    scaleRef.current = { lo: scale.lo / MAN, hi: scale.hi / MAN }
    const { up, down } = view.colors
    INVESTORS.forEach(({ key }, i) => {
      const { cum, day } = view.panes[i]
      cum.setData(rows.map((d, x) => ({ time: d.date, value: totals[x][key] / MAN })))
      day.setData(
        rows.map((d) => {
          const value = d[key]
          return value === null ? { time: d.date } : { time: d.date, value: value / MAN, color: value >= 0 ? up : down }
        }),
      )
      cum.applyOptions({ visible: mode === 'cum' })
      day.applyOptions({ visible: mode === 'day' })
    })
    view.chart.timeScale().fitContent()
    pointing.current = true
    view.chart.clearCrosshairPosition()
    pointing.current = false
  }, [rows, totals, mode])

  const point = (index: number) => {
    const view = mounted.current
    const day = rows[index]
    if (view && day) {
      const pane = view.panes[0]
      const value = mode === 'cum' ? totals[index].foreign / MAN : (day.foreign ?? 0) / MAN
      pointing.current = true
      view.chart.setCrosshairPosition(value, day.date, mode === 'cum' ? pane.cum : pane.day)
      pointing.current = false
    }
    setHover(index)
  }

  const unpoint = () => {
    const view = mounted.current
    if (view) {
      pointing.current = true
      view.chart.clearCrosshairPosition()
      pointing.current = false
    }
    setHover(null)
    setKb(null)
  }

  const pickMode = (next: FlowMode) => {
    setMode(next)
    setHover(null)
    setKb(null)
  }
  const pickRange = (next: FlowRange) => {
    setRange(next)
    setHover(null)
    setKb(null)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (count === 0) return
    if (event.key === 'Escape') {
      unpoint()
      return
    }
    const index = keyboardIndex(event.key, event.shiftKey, kb, count)
    if (index === null) return
    event.preventDefault()
    point(index)
    setKb(index)
  }

  const reading = flowReading({ window: rows, totals, hover, mode, streaks, refYear })
  const lead = flowLead(streaks)
  const tail = flowTail(rows)
  const holding = holdingText(foreignHolding(rows), count)
  const kbIndex = kb ?? count - 1
  const recent = recentFlowRows(days)

  return (
    <section className="fg-section fg-sff" aria-labelledby={FLOW_TITLE_ID}>
      <div className="fg-section__head">
        <div className="fg-sf__heading">
          <h2 id={FLOW_TITLE_ID} className="fg-section__title fg-sf__anchor" tabIndex={-1}>
            투자자별 매매
          </h2>
          {(lead || tail) && (
            <p className="fg-section__sub">
              {lead && <b className="fg-sf__lead">{lead}</b>}
              {lead && tail && ' '}
              {tail}
            </p>
          )}
        </div>
        <div className="fg-sff__tools">
          <Segment label="보기" options={FLOW_MODES} value={mode} onChange={pickMode} />
          {options.length > 1 && <Segment label="기간" options={options} value={active} onChange={pickRange} />}
        </div>
      </div>
      <p className="fg-sff__when fg-num" aria-hidden="true">
        {reading.when}
      </p>
      <dl className="fg-sff__read fg-num">
        {reading.items.map((item) => (
          <div key={item.key}>
            <dt>{item.who}</dt>
            <dd className={`fg-${item.tone}`}>{item.value}</dd>
            <small>{item.note || ' '}</small>
          </div>
        ))}
      </dl>
      {holding && <p className="fg-sff__hold fg-num">{holding}</p>}
      <div
        className="fg-sff__lw"
        role="slider"
        tabIndex={0}
        aria-label="투자자별 순매수 차트, 단위 만 주"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, count - 1)}
        aria-valuenow={Math.max(0, kbIndex)}
        aria-valuetext={rows[kbIndex] ? flowValueText(rows[kbIndex], refYear) : ''}
        aria-describedby={helpId}
        onKeyDown={onKeyDown}
      >
        <div ref={hostRef} className="fg-sff__host" />
      </div>
      <p id={helpId} className="fg-sf__foot">
        {flowHelp(mode)}
      </p>
      <h3 id={daysId} className="fg-sff__h3">
        {`최근 ${recent.length}거래일`}
      </h3>
      <div className="fg-ftable-wrap" role="region" aria-labelledby={daysId} tabIndex={0}>
        <table className="fg-ftable fg-ftable--days fg-num">
          <thead>
            <tr>
              <th scope="col">날짜</th>
              <th scope="col">종가</th>
              <th scope="col">등락률</th>
              {INVESTORS.map(({ key, label }) => (
                <th key={key} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.map((day) => (
              <tr
                key={day.date}
                onMouseEnter={() => {
                  const index = rows.findIndex((d) => d.date === day.date)
                  if (index >= 0) point(index)
                }}
                onMouseLeave={unpoint}
              >
                <th scope="row">{flowDateLabel(day.date)}</th>
                <td>{day.close === null ? '—' : formatChartPrice(day.close)}</td>
                <td className={cn(day.change !== null && toneClass(day.change))}>{flowChangeText(day.change)}</td>
                {INVESTORS.map(({ key }) => (
                  <td key={key} className={cn(day[key] !== null && toneClass(day[key]))}>
                    {day[key] === null ? '—' : formatManShares(day[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fg-sf__foot">외국인·기관·개인 순매수 단위 만 주 · 한국거래소 장 마감 집계</p>
    </section>
  )
}
