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
    <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-caption leading-relaxed text-foreground-secondary break-keep">
      <p className="font-semibold text-foreground">트리맵 보는 법</p>
      <span className="inline-flex items-center gap-2">
        <span className="font-mono tabular-nums text-stock-down">−{COLOR_SATURATION_PCT}%</span>
        <span aria-hidden className="h-2 w-28 rounded-full" style={{ backgroundImage: gradient }} />
        <span className="font-mono tabular-nums text-stock-up">+{COLOR_SATURATION_PCT}%</span>
      </span>
      {range && <span className="font-mono tabular-nums">{range}</span>}
      <span>색 = 등락률, ±{COLOR_SATURATION_PCT}%에서 가장 진함</span>
      <span>칸 크기 = 등락률 크기 · ▲상승 ▼하락 종목 수</span>
    </div>
  )
}
