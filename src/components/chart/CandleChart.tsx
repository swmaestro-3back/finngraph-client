import { memo, useMemo, useRef, useState } from 'react'
import { AxisRules, DateTicks } from '@/components/chart/AxisMarks'
import type { Candle } from '@/lib/apiTypes'
import {
  barLeft,
  barWidth,
  dateTickIndexes,
  emphasis,
  indexFromX,
  priceAtY,
  roundToTick,
  slotCenter,
} from '@/lib/chartAxis'
import { formatChange, formatPrice, formatVolume } from '@/lib/format'
import { toneClass } from '@/lib/fg/format'
import { cn } from '@/lib/utils'

const TOOLTIP_OFFSET = 14
const TOOLTIP_W = 168
const TOOLTIP_H = 140

const GRID_LEVELS = [0, 0.25, 0.5, 0.75, 1]

interface CandleChartProps {
  candles: Candle[]
  hoveredIndex?: number | null
  selectedIndex?: number | null
  onHoverIndex?: (index: number | null) => void
  onSelect?: (index: number | null) => void
  showDates?: boolean
}

interface HoverState {
  index: number
  x: number
  y: number
  price: number
  flipX: boolean
  flipY: boolean
}

function barTone(candle: Candle): string {
  return candle.close >= candle.open ? 'fg-candle--up' : 'fg-candle--down'
}

const CandleLayer = memo(function CandleLayer({
  candles,
  min,
  max,
  activeIndex,
}: {
  candles: Candle[]
  min: number
  max: number
  activeIndex: number | null
}) {
  const count = candles.length
  const range = max - min || 1
  const yPct = (v: number) => ((max - v) / range) * 100

  return (
    <>
      {GRID_LEVELS.map((level) => (
        <div key={level} className="fg-candle__grid" style={{ top: `${level * 100}%` }}>
          <span className="fg-candle__tick fg-num">{formatPrice(Math.round(max - range * level))}</span>
        </div>
      ))}
      {candles.map((candle, i) => {
        const bodyTop = yPct(Math.max(candle.open, candle.close))
        const bodyBottom = yPct(Math.min(candle.open, candle.close))
        return (
          <div key={i}>
            <div
              className={cn('fg-candle__wick', barTone(candle))}
              style={{
                left: `${slotCenter(i, count)}%`,
                top: `${yPct(candle.high)}%`,
                height: `${yPct(candle.low) - yPct(candle.high)}%`,
              }}
            />
            <div
              className={cn('fg-candle__body', barTone(candle))}
              style={{
                left: `${barLeft(i, count)}%`,
                width: `${barWidth(count)}%`,
                top: `${bodyTop}%`,
                height: `${Math.max(bodyBottom - bodyTop, 0.3)}%`,
                opacity: emphasis(i, activeIndex, 1, 0.75),
              }}
            />
          </div>
        )
      })}
    </>
  )
})

const VolumeLayer = memo(function VolumeLayer({
  candles,
  maxVolume,
  activeIndex,
}: {
  candles: Candle[]
  maxVolume: number
  activeIndex: number | null
}) {
  const count = candles.length
  return (
    <>
      {candles.map((candle, i) => (
        <div
          key={i}
          className={cn('fg-candle__vbar', barTone(candle))}
          style={{
            left: `${barLeft(i, count)}%`,
            width: `${barWidth(count)}%`,
            height: `${(candle.volume / maxVolume) * 100}%`,
            opacity: emphasis(i, activeIndex, 0.55, 0.35),
          }}
        />
      ))}
    </>
  )
})

export function CandleChart({
  candles,
  hoveredIndex = null,
  selectedIndex = null,
  onHoverIndex,
  onSelect,
  showDates = true,
}: CandleChartProps) {
  const areaRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<HoverState | null>(null)

  const { min, max, maxVolume } = useMemo(() => {
    const lows = candles.map((c) => c.low)
    const highs = candles.map((c) => c.high)
    return {
      min: Math.min(...lows),
      max: Math.max(...highs),
      maxVolume: Math.max(...candles.map((c) => c.volume)),
    }
  }, [candles])

  const count = candles.length
  const dateIndexes = dateTickIndexes(count)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = areaRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const index = indexFromX(x, rect.width, count)
    setHover({
      index,
      x,
      y,
      price: roundToTick(priceAtY(y, rect.height, min, max)),
      flipX: x + TOOLTIP_OFFSET + TOOLTIP_W > rect.width,
      flipY: y - TOOLTIP_OFFSET - TOOLTIP_H < 0,
    })
    if (index !== hover?.index) onHoverIndex?.(index)
  }

  const handleMouseLeave = () => {
    setHover(null)
    onHoverIndex?.(null)
  }

  const handleVolumeMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    onHoverIndex?.(indexFromX(e.clientX - rect.left, rect.width, count))
  }

  const toggleSelect = (index: number) => onSelect?.(index === selectedIndex ? null : index)

  const hovered = hover ? candles[hover.index] : null
  const hoveredChange = hovered ? ((hovered.close - hovered.open) / hovered.open) * 100 : 0

  const crosshairIndex = hover?.index ?? hoveredIndex
  const activeIndex = crosshairIndex ?? selectedIndex

  return (
    <div className="fg-candle">
      <div
        ref={areaRef}
        className={cn('fg-candle__area', onSelect && 'fg-candle__area--pick')}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => hover && toggleSelect(hover.index)}
      >
        <CandleLayer candles={candles} min={min} max={max} activeIndex={activeIndex} />

        <AxisRules selectedIndex={selectedIndex} crosshairIndex={crosshairIndex} count={count} />

        {hover && (
          <div className="fg-candle__cross">
            <div className="fg-candle__hline" style={{ top: hover.y }} />
            <span className="fg-candle__ylabel fg-num" style={{ top: `clamp(9px, ${hover.y}px, calc(100% - 9px))` }}>
              {formatPrice(hover.price)}
            </span>
          </div>
        )}

        {hovered && hover && (
          <div
            className="fg-candle__tip fg-num"
            style={{
              left: hover.x,
              top: hover.y,
              transform: `translate(${
                hover.flipX ? `calc(-100% - ${TOOLTIP_OFFSET}px)` : `${TOOLTIP_OFFSET}px`
              }, ${hover.flipY ? `${TOOLTIP_OFFSET}px` : `calc(-100% - ${TOOLTIP_OFFSET}px)`})`,
            }}
          >
            <div className="fg-candle__tip-head">
              <b>{hovered.label}</b>
              <span className={toneClass(hoveredChange)}>{formatChange(hoveredChange)}</span>
            </div>
            <dl className="fg-candle__tip-grid">
              {(
                [
                  ['시가', hovered.open],
                  ['고가', hovered.high],
                  ['저가', hovered.low],
                  ['종가', hovered.close],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{formatPrice(value)}</dd>
                </div>
              ))}
              <div>
                <dt>거래량</dt>
                <dd>{formatVolume(hovered.volume)}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      <div className="fg-candle__vhead">
        <span>거래량</span>
        <span className="fg-num">최대 {formatVolume(maxVolume)}</span>
      </div>
      <div
        className={cn('fg-candle__volume', onSelect && 'fg-candle__area--pick')}
        onMouseMove={handleVolumeMove}
        onMouseLeave={() => onHoverIndex?.(null)}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          toggleSelect(indexFromX(e.clientX - rect.left, rect.width, count))
        }}
      >
        <VolumeLayer candles={candles} maxVolume={maxVolume} activeIndex={activeIndex} />
        <AxisRules selectedIndex={selectedIndex} crosshairIndex={crosshairIndex} count={count} />
      </div>

      {showDates && <DateTicks labels={dateIndexes.map((idx) => candles[idx].label)} />}
    </div>
  )
}
