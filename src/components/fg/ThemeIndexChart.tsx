import { useMemo, type MouseEvent, type Ref } from 'react'
import type { ThemeIndexCandleRes } from '@/lib/apiTypes'
import { formatChange } from '@/lib/format'
import { dateTicks, monthDayLabel, niceAxis, type DateTickMode } from '@/lib/fg/themeCharts'
import { formatIndexValue } from '@/lib/fg/themeIndex'
import type { NewsMarker } from '@/lib/fg/themeNews'
import { useChanged } from '@/lib/fg/useChanged'
import { cn } from '@/lib/utils'

const VIEW_W = 600
const VIEW_H = 200
const PAD_Y = 8

interface ThemeIndexChartProps {
  candles: readonly ThemeIndexCandleRes[]
  move: number
  periodLabel: string
  tickMode: DateTickMode
  markers: readonly NewsMarker[]
  selected: NewsMarker | null
  areaRef: Ref<HTMLDivElement>
  onPick: (marker: NewsMarker) => void
  onPlotTap: (event: MouseEvent<HTMLDivElement>) => void
}

export function ThemeIndexChart({
  candles,
  move,
  periodLabel,
  tickMode,
  markers,
  selected,
  areaRef,
  onPick,
  onPlotTap,
}: ThemeIndexChartProps) {
  const redraw = useChanged(periodLabel) ? 'fg-reveal' : undefined
  const geometry = useMemo(() => {
    const closes = candles.map((c) => c.close)
    const axis = niceAxis(Math.min(...closes), Math.max(...closes), 4)
    const last = Math.max(candles.length - 1, 1)
    const x = (i: number) => (i / last) * VIEW_W
    const y = (v: number) => PAD_Y + ((axis.hi - v) / (axis.hi - axis.lo || 1)) * (VIEW_H - PAD_Y * 2)
    const points = closes.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('L')
    return {
      axis,
      last,
      y,
      line: `M${points}`,
      area: `M0,${VIEW_H}L${points}L${VIEW_W},${VIEW_H}Z`,
      grid: axis.ticks.map((v) => `M0,${y(v).toFixed(1)}H${VIEW_W}`).join(''),
    }
  }, [candles])

  const dates = candles.map((c) => c.date)
  const year = Number(dates[dates.length - 1].slice(0, 4))
  const ticks = dateTicks(dates, tickMode)
  const leftOf = (i: number) => `${((i / geometry.last) * 100).toFixed(2)}%`
  const topOf = (i: number) => `${((geometry.y(candles[i].close) / VIEW_H) * 100).toFixed(2)}%`
  const first = candles[0]
  const end = candles[candles.length - 1]
  const aria = `테마 지수 ${periodLabel}, ${monthDayLabel(first.date, year)} ${formatIndexValue(first.close)}에서 ${monthDayLabel(end.date, year)} ${formatIndexValue(end.close)}, ${formatChange(move)}, 뉴스 표시 ${markers.length}곳`

  return (
    <div className={cn('fg-tix fg-reveal', move < 0 && 'fg-tix--down')}>
      <div className="fg-tix__y fg-num" aria-hidden="true">
        {geometry.axis.ticks.map((v) => (
          <span key={v} style={{ top: `${((geometry.y(v) / VIEW_H) * 100).toFixed(2)}%` }}>
            {v.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}
          </span>
        ))}
      </div>
      <div className="fg-tix__plot">
        <div className="fg-tix__area" ref={areaRef} onClick={onPlotTap}>
          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" role="img" aria-label={aria}>
            <path className="fg-tix__grid" d={geometry.grid} vectorEffect="non-scaling-stroke" />
            <g key={periodLabel} className={redraw}>
              <path className="fg-tix__fill" d={geometry.area} />
              <path className="fg-tix__line" d={geometry.line} vectorEffect="non-scaling-stroke" />
            </g>
          </svg>
          {selected && (
            <span
              className="fg-tix__sel"
              style={{ left: leftOf(selected.at), top: `calc(${topOf(selected.at)} - 4px)` }}
              aria-hidden="true"
            />
          )}
          {[...markers].reverse().map((marker) => (
            <button
              key={marker.id}
              type="button"
              className="fg-tix__mk"
              style={{
                left: `calc(${leftOf(marker.at)} - ${marker.left.toFixed(1)}px)`,
                top: `calc(${topOf(marker.at)} - 12px)`,
                width: `${(marker.left + marker.right).toFixed(1)}px`,
              }}
              aria-pressed={selected?.id === marker.id}
              aria-label={marker.aria}
              disabled={marker.locked}
              onClick={() => onPick(marker)}
            >
              <span className="fg-tix__dia" style={{ left: `${marker.left.toFixed(1)}px` }} />
            </button>
          ))}
        </div>
        <div className="fg-tix__x" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick.index} style={{ left: leftOf(tick.index) }}>
              {tick.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
