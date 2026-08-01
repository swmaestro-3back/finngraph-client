import { useMemo, useRef, useState } from 'react'
import type { Candle } from '@/data/candles'
import { changeColorClass, formatChange, formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

const UP = '#cf202f'
const DOWN = '#0052ff'

interface CandleChartProps {
  candles: Candle[]
}

/** 캔들 300px + 거래량 90px + 날짜 라벨 + hover 툴팁 (design-specs/theme-detail.md §1.4) */
export function CandleChart({ candles }: CandleChartProps) {
  const areaRef = useRef<HTMLDivElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const { min, max, maxVolume } = useMemo(() => {
    const lows = candles.map((c) => c.low)
    const highs = candles.map((c) => c.high)
    return {
      min: Math.min(...lows),
      max: Math.max(...highs),
      maxVolume: Math.max(...candles.map((c) => c.volume)),
    }
  }, [candles])

  const range = max - min || 1
  const slot = 100 / candles.length
  const yPct = (v: number) => ((max - v) / range) * 100

  const gridLevels = [0, 0.25, 0.5, 0.75, 1]
  const dateIndexes = [0, 0.33, 0.66, 0.99].map((f) =>
    Math.min(candles.length - 1, Math.floor(candles.length * f)),
  )

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = areaRef.current?.getBoundingClientRect()
    if (!rect) return
    const ratio = (e.clientX - rect.left) / rect.width
    const index = Math.min(candles.length - 1, Math.max(0, Math.floor(ratio * candles.length)))
    setHoverIndex(index)
  }

  const hovered = hoverIndex !== null ? candles[hoverIndex] : null
  const hoveredChange = hovered ? ((hovered.close - hovered.open) / hovered.open) * 100 : 0

  return (
    <div>
      {/* 캔들 영역 */}
      <div
        ref={areaRef}
        className="relative mr-16 h-[max(200px,20.833vw)]"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {gridLevels.map((level) => (
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
                  left: `${i * slot + slot / 2}%`,
                  top: `${yPct(candle.high)}%`,
                  height: `${yPct(candle.low) - yPct(candle.high)}%`,
                  backgroundColor: color,
                }}
              />
              <div
                className="absolute rounded-[1px]"
                style={{
                  left: `${i * slot + slot * 0.18}%`,
                  width: `${slot * 0.64}%`,
                  top: `${bodyTop}%`,
                  height: `${Math.max(bodyBottom - bodyTop, 0.3)}%`,
                  backgroundColor: color,
                  opacity: hoverIndex === null || hoverIndex === i ? 1 : 0.75,
                }}
              />
            </div>
          )
        })}

        {/* 크로스헤어 + 툴팁 */}
        {hovered && hoverIndex !== null && (
          <>
            <div
              className="pointer-events-none absolute top-0 bottom-0 w-px bg-[#a8acb3]"
              style={{ left: `${hoverIndex * slot + slot / 2}%` }}
            />
            <div
              className={cn(
                'pointer-events-none absolute top-2 z-10 w-[168px] rounded-xl border border-border bg-background p-3 shadow-[0_4px_12px_rgba(0,0,0,0.06)]',
                hoverIndex < candles.length / 2 ? 'right-2' : 'left-2',
              )}
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
          </>
        )}
      </div>

      {/* 거래량 */}
      <div className="mt-3 mr-16 flex items-baseline justify-between">
        <span className="text-xs font-semibold text-foreground">거래량</span>
        <span className="text-[11px] text-muted-foreground">
          최대 {formatPrice(maxVolume)}만주
        </span>
      </div>
      <div className="relative mr-16 h-[max(64px,6.25vw)] border-b border-border">
        {candles.map((candle, i) => {
          const rising = candle.close >= candle.open
          return (
            <div
              key={i}
              className="absolute bottom-0 opacity-55"
              style={{
                left: `${i * slot + slot * 0.18}%`,
                width: `${slot * 0.64}%`,
                height: `${(candle.volume / maxVolume) * 100}%`,
                backgroundColor: rising ? UP : DOWN,
              }}
            />
          )
        })}
      </div>

      {/* 날짜 라벨 */}
      <div className="relative mt-1.5 mr-16 h-[18px]">
        {dateIndexes.map((idx, k) => (
          <span
            key={k}
            className="absolute font-mono text-[10px] font-medium text-muted-foreground"
            style={{ left: `${[0, 33, 66, 99][k]}%` }}
          >
            {candles[idx].label}
          </span>
        ))}
      </div>
    </div>
  )
}
