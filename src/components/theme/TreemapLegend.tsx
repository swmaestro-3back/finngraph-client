import { COLOR_SATURATION_PCT, treemapTileColor } from '@/lib/treemapColor'
import { formatChange } from '@/lib/format'

interface TreemapLegendProps {
  maxUp: number | null
  maxDown: number | null
}

export function TreemapLegend({ maxUp, maxDown }: TreemapLegendProps) {
  const gradient = `linear-gradient(90deg, ${treemapTileColor('down', 1)} 0%, ${treemapTileColor('down', 0.12)} 46%, ${treemapTileColor('up', 0.12)} 54%, ${treemapTileColor('up', 1)} 100%)`
  const range =
    maxUp === null && maxDown === null
      ? null
      : `오늘 ${maxDown === null ? '0.00%' : formatChange(-maxDown)} ~ ${maxUp === null ? '0.00%' : formatChange(maxUp)}`

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-caption text-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-2">
          <span className="font-mono tabular-nums text-stock-down">−{COLOR_SATURATION_PCT}%</span>
          <span aria-hidden className="h-2 w-28 rounded-full" style={{ backgroundImage: gradient }} />
          <span className="font-mono tabular-nums text-stock-up">+{COLOR_SATURATION_PCT}%</span>
        </span>
        <span className="break-keep">색 = 등락률, ±{COLOR_SATURATION_PCT}%에서 가장 진함</span>
        {range && <span className="font-mono tabular-nums break-keep">{range}</span>}
      </div>
      <span className="break-keep">
        칸 크기 = 등락률 크기 · ▲상승 ▼하락 종목 수 · 주도주 = 가장 크게 움직인 종목
      </span>
    </div>
  )
}
