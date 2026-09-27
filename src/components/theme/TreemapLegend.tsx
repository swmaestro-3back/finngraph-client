import { treemapTileColor } from '@/lib/treemapColor'
import { formatChange } from '@/lib/format'

interface TreemapLegendProps {
  maxUp: number | null
  maxDown: number | null
}

export function TreemapLegend({ maxUp, maxDown }: TreemapLegendProps) {
  const gradient = `linear-gradient(90deg, ${treemapTileColor('down', 1)} 0%, ${treemapTileColor('down', 0.12)} 46%, ${treemapTileColor('up', 0.12)} 54%, ${treemapTileColor('up', 1)} 100%)`

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-caption text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="w-14 text-right font-mono tabular-nums text-stock-down">
          {maxDown === null ? '' : formatChange(-maxDown)}
        </span>
        <span aria-hidden className="h-2 w-36 rounded-full" style={{ backgroundImage: gradient }} />
        <span className="w-14 font-mono tabular-nums text-stock-up">
          {maxUp === null ? '' : formatChange(maxUp)}
        </span>
        <span>색 = 등락 방향과 강도</span>
      </div>
      <span className="break-keep">칸 크기 = 등락률 크기 · 타일을 누르면 아래 구성 종목과 뉴스가 바뀝니다</span>
    </div>
  )
}
