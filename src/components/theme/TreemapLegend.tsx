import { changeStrength, COLOR_SATURATION_PCT, mixColor, tileInk } from '@/lib/treemapColor'
import { formatChange } from '@/lib/format'

const LEGEND_STEPS = [-COLOR_SATURATION_PCT, -3, -1, 1, 3, COLOR_SATURATION_PCT]

interface TreemapLegendProps {
  maxUp: number | null
  maxDown: number | null
}

export function TreemapLegend({ maxUp, maxDown }: TreemapLegendProps) {
  const range =
    maxUp === null && maxDown === null
      ? null
      : `오늘 ${maxDown === null ? '0.00%' : formatChange(-maxDown)} ~ ${maxUp === null ? '0.00%' : formatChange(maxUp)}`

  return (
    <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-caption leading-relaxed text-foreground-secondary break-keep">
      <p className="font-semibold text-foreground">트리맵 보는 법</p>
      <span className="flex gap-[3px]">
        {LEGEND_STEPS.map((pct) => {
          const dir = pct > 0 ? 'up' : 'down'
          const { bg, rgb } = mixColor(dir, changeStrength(pct))
          return (
            <span
              key={pct}
              className="flex h-6 flex-1 items-center justify-center rounded-md font-mono tabular-nums"
              style={{ backgroundColor: bg, color: tileInk(rgb, dir) }}
            >
              {pct > 0 ? '+' : '−'}
              {Math.abs(pct)}%
            </span>
          )
        })}
      </span>
      {range && <span className="font-mono tabular-nums">{range}</span>}
      <span>색 = 등락률, ±{COLOR_SATURATION_PCT}%에서 가장 진함</span>
      <span>칸 크기 = 등락률 크기 · ▲상승 ▼하락 종목 수</span>
    </div>
  )
}
