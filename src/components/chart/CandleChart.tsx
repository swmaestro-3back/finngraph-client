import { memo, useMemo, useRef, useState } from 'react'
import { AxisRules, DateTicks } from '@/components/chart/AxisMarks'
import type { Candle } from '@/data/candles'
import {
  AXIS_GUTTER,
  DOWN,
  UP,
  barLeft,
  barWidth,
  dateTickIndexes,
  emphasis,
  indexFromX,
  slotCenter,
} from '@/lib/chartAxis'
import { changeColorClass, formatChange, formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

// 커서를 따라다니는 툴팁의 기본 위치 = 포인터 오른쪽 대각선 위. 가장자리에선 반대편으로 뒤집는다.
const TOOLTIP_OFFSET = 14
const TOOLTIP_W = 168
// 위쪽 가장자리 뒤집기 판정용 근사 높이 (내용이 고정이라 대략 일정)
const TOOLTIP_H = 140

const GRID_LEVELS = [0, 0.25, 0.5, 0.75, 1]

interface CandleChartProps {
  candles: Candle[]
  /** 축을 공유하는 레인이 짚고 있는 칸 — 여기서도 크로스헤어를 그린다 */
  hoveredIndex?: number | null
  /** 선택 고정된 칸 — 관통 세로 룰 */
  selectedIndex?: number | null
  onHoverIndex?: (index: number | null) => void
  onSelect?: (index: number | null) => void
  /** 아래에 이슈 레인이 붙으면 레인이 날짜 라벨을 그리므로 끈다 */
  showDates?: boolean
}

/** 커서 위치 + 어느 캔들 위인지 + 가장자리 뒤집기 여부 */
interface HoverState {
  index: number
  x: number
  y: number
  flipX: boolean
  flipY: boolean
}

// 커서 좌표(x, y)는 매 픽셀 바뀌지만 막대들은 짚은 칸(activeIndex)이 바뀔 때만 달라진다.
// 레이어를 memo로 떼어내 마우스를 흔들어도 캔들 DOM 120여 개를 다시 그리지 않는다.

/** 가격 그리드 + 캔들 본체 */
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
        <div
          key={level}
          className="absolute right-0 left-0 border-t border-surface-inset"
          style={{ top: `${level * 100}%` }}
        >
          <span className="absolute top-[-7px] left-full pl-2 font-mono text-[10px] font-medium whitespace-nowrap text-muted-foreground">
            {formatPrice(Math.round(max - range * level))}
          </span>
        </div>
      ))}
      {candles.map((candle, i) => {
        const rising = candle.close >= candle.open
        const color = rising ? UP : DOWN
        const bodyTop = yPct(Math.max(candle.open, candle.close))
        const bodyBottom = yPct(Math.min(candle.open, candle.close))
        return (
          <div key={i}>
            <div
              className="absolute w-px opacity-85"
              style={{
                left: `${slotCenter(i, count)}%`,
                top: `${yPct(candle.high)}%`,
                height: `${yPct(candle.low) - yPct(candle.high)}%`,
                backgroundColor: color,
              }}
            />
            <div
              className="absolute rounded-[1px]"
              style={{
                left: `${barLeft(i, count)}%`,
                width: `${barWidth(count)}%`,
                top: `${bodyTop}%`,
                height: `${Math.max(bodyBottom - bodyTop, 0.3)}%`,
                backgroundColor: color,
                // 캔들은 얇아 많이 죽이면 가격 흐름이 끊긴다 — 살짝만 물러난다
                opacity: emphasis(i, activeIndex, 1, 0.75),
              }}
            />
          </div>
        )
      })}
    </>
  )
})

/** 거래량 막대 */
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
          className="absolute bottom-0"
          style={{
            left: `${barLeft(i, count)}%`,
            width: `${barWidth(count)}%`,
            height: `${(candle.volume / maxVolume) * 100}%`,
            backgroundColor: candle.close >= candle.open ? UP : DOWN,
            opacity: emphasis(i, activeIndex, 0.55, 0.35),
          }}
        />
      ))}
    </>
  )
})

/** 캔들 300px + 거래량 90px + 날짜 라벨 + hover 툴팁 (design-specs/theme-detail.md §1.4) */
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
      // 오른쪽/위쪽 끝에서 툴팁이 잘리면 반대편으로 뒤집는다
      flipX: x + TOOLTIP_OFFSET + TOOLTIP_W > rect.width,
      flipY: y - TOOLTIP_OFFSET - TOOLTIP_H < 0,
    })
    // 부모의 hover 상태는 스냅된 칸 단위 — 같은 칸 안에서는 다시 알리지 않는다
    if (index !== hover?.index) onHoverIndex?.(index)
  }

  const handleMouseLeave = () => {
    setHover(null)
    onHoverIndex?.(null)
  }

  /** 거래량 레인 — 캔들과 같은 축이므로 같은 칸을 짚는다. 툴팁은 캔들 영역 좌표라 여기선 띄우지 않는다 */
  const handleVolumeMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    onHoverIndex?.(indexFromX(e.clientX - rect.left, rect.width, count))
  }

  const toggleSelect = (index: number) => onSelect?.(index === selectedIndex ? null : index)

  const hovered = hover ? candles[hover.index] : null
  const hoveredChange = hovered ? ((hovered.close - hovered.open) / hovered.open) * 100 : 0

  // 커서가 캔들 위에 없어도 레인이 짚은 칸이면 크로스헤어를 그린다 — 두 차트가 같은 자리를 가리킨다.
  // 선택 룰은 그와 별개로 계속 남는다.
  const crosshairIndex = hover?.index ?? hoveredIndex
  const activeIndex = crosshairIndex ?? selectedIndex

  return (
    <div>
      {/* 캔들 영역 */}
      <div
        ref={areaRef}
        className={cn('relative h-[max(200px,20.833vw)]', AXIS_GUTTER, onSelect && 'cursor-pointer')}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => hover && toggleSelect(hover.index)}
      >
        <CandleLayer candles={candles} min={min} max={max} activeIndex={activeIndex} />

        {/* 선택 룰 — 커서가 떠나도 남아 이슈 레인의 룰과 이어져 보인다 */}
        <AxisRules
          selectedIndex={selectedIndex}
          crosshairIndex={crosshairIndex}
          count={count}
        />

        {/* 커서를 따라다니는 툴팁 */}
        {hovered && hover && (
          <div
            className="pointer-events-none absolute z-10 w-[168px] rounded-xl border border-border bg-background p-3 shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
            style={{
              left: hover.x,
              top: hover.y,
              // 기본: 포인터 오른쪽 대각선 위로 살짝 띄움 / 가장자리에선 반대편으로
              transform: `translate(${
                hover.flipX ? `calc(-100% - ${TOOLTIP_OFFSET}px)` : `${TOOLTIP_OFFSET}px`
              }, ${hover.flipY ? `${TOOLTIP_OFFSET}px` : `calc(-100% - ${TOOLTIP_OFFSET}px)`})`,
            }}
          >
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="font-mono text-xs font-medium text-foreground">
                {hovered.label}
              </span>
              <span
                className={cn(
                  'font-mono text-[11px] font-medium',
                  changeColorClass(hoveredChange),
                )}
              >
                {formatChange(hoveredChange)}
              </span>
            </div>
            {(
              [
                ['시가', hovered.open],
                ['고가', hovered.high],
                ['저가', hovered.low],
                ['종가', hovered.close],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between text-[11px] leading-[1.6]">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono font-medium text-foreground">
                  {formatPrice(value)}
                </span>
              </div>
            ))}
            <div className="flex justify-between text-[11px] leading-[1.6]">
              <span className="text-muted-foreground">거래량</span>
              <span className="font-mono font-medium text-foreground">
                {formatPrice(hovered.volume)}만주
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 거래량 */}
      <div className={cn('mt-3 flex items-baseline justify-between', AXIS_GUTTER)}>
        <span className="text-xs font-semibold text-foreground">거래량</span>
        <span className="text-[11px] text-muted-foreground">
          최대 {formatPrice(maxVolume)}만주
        </span>
      </div>
      <div
        className={cn(
          'relative h-[max(64px,6.25vw)] border-b border-border',
          AXIS_GUTTER,
          onSelect && 'cursor-pointer',
        )}
        onMouseMove={handleVolumeMove}
        onMouseLeave={() => onHoverIndex?.(null)}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          toggleSelect(indexFromX(e.clientX - rect.left, rect.width, count))
        }}
      >
        <VolumeLayer candles={candles} maxVolume={maxVolume} activeIndex={activeIndex} />
        <AxisRules
          selectedIndex={selectedIndex}
          crosshairIndex={crosshairIndex}
          count={count}
        />
      </div>

      {/* 날짜 라벨 — 아래에 이슈 레인이 붙으면 레인이 대신 그린다 */}
      {showDates && (
        <DateTicks
          className={AXIS_GUTTER}
          labels={dateIndexes.map((idx) => candles[idx].label)}
        />
      )}
    </div>
  )
}
