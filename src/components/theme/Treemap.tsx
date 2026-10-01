import { useEffect, useMemo, useRef, useState } from 'react'
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy'
import { formatChange } from '@/lib/format'
import { tileDetailPlacement } from '@/lib/themeMetrics'
import { changeStrength, mixColor, tileInk } from '@/lib/treemapColor'
import { cn } from '@/lib/utils'

export interface TreemapItem {
  id: string
  name: string
  change: number
  size: number
  detail?: string
  label?: string
}

const BASE_W = 1136
const DEFAULT_RATIO = 1200 / 520

function splitParen(name: string): [string, string | null] {
  const i = name.indexOf('(')
  if (i <= 0) return [name, null]
  return [name.slice(0, i).trim(), name.slice(i).trim()]
}

interface TreemapProps {
  items: TreemapItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  ratio?: number
  className?: string
}

export function Treemap({
  items,
  selectedId,
  onSelect,
  ratio = DEFAULT_RATIO,
  className,
}: TreemapProps) {
  const baseH = BASE_W / ratio
  const containerRef = useRef<HTMLDivElement>(null)
  const [renderWidth, setRenderWidth] = useState(BASE_W)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) setRenderWidth(width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const nodes = useMemo(() => {
    type TreeDatum = { children?: TreemapItem[] } & Partial<TreemapItem>
    if (items.length === 0) return []
    const root = hierarchy<TreeDatum>({ children: items })
      .sum((d) => d.size ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    const layout = treemap<TreeDatum>().tile(treemapSquarify).size([BASE_W, baseH]).paddingInner(3)

    return layout(root)
      .leaves()
      .map((leaf) => {
        const theme = leaf.data as TreemapItem
        return { theme, change: theme.change, x0: leaf.x0, y0: leaf.y0, x1: leaf.x1, y1: leaf.y1 }
      })
  }, [items, baseH])

  const scale = renderWidth / BASE_W

  return (
    <div className={cn('pb-3', className)}>
      <div
        ref={containerRef}
        className="relative w-full rounded-2xl bg-surface-inset"
        style={{ aspectRatio: `${ratio}` }}
      >
      {nodes.length === 0 && (
        <div
          role="status"
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center"
        >
          <span className="text-sm font-medium text-foreground">핫테마 집계 중</span>
          <span className="text-xs text-muted-foreground">
            테마 등락률이 준비되면 자동으로 표시됩니다
          </span>
        </div>
      )}
      {nodes.map(({ theme, change, x0, y0, x1, y1 }, i) => {
        const w = (x1 - x0) * scale
        const h = (y1 - y0) * scale
        const dir = change >= 0 ? 'up' : 'down'
        const { bg, rgb } = mixColor(dir, changeStrength(change))
        const textColor = tileInk(rgb, dir)
        const isSelected = theme.id === selectedId

        const small = h < 40 || w < 72
        const nameSize = small ? 11 : w < 130 ? 13 : w < 200 ? 15 : 17
        const pctSize = small ? 11 : w < 200 ? 12 : 13
        const showPct = h >= 36 && w >= 52
        const singleLine = h < 56
        const [mainName, parenName] = splitParen(theme.name)
        const splitName = !singleLine && parenName !== null
        const detail = theme.detail ?? ''
        const pctText = `${change > 0 ? '+' : '−'}${Math.abs(change).toFixed(2)}%`
        const placement = tileDetailPlacement(w, h, pctText, detail)
        const inlineDetail = placement === 'inline' ? detail : null
        const showDetail = placement === 'line'
        const label = theme.label ?? `${theme.name} ${formatChange(change)}`

        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => onSelect(theme.id)}
            aria-pressed={isSelected}
            aria-label={label}
            title={label}
            className={cn(
              'absolute box-border flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[6px] text-center',
              'focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2',
              'hover:z-10 hover:-translate-y-0.5 hover:brightness-[1.04]',
              'motion-safe:[transition:left_500ms_cubic-bezier(0.22,1,0.36,1),top_500ms_cubic-bezier(0.22,1,0.36,1),width_500ms_cubic-bezier(0.22,1,0.36,1),height_500ms_cubic-bezier(0.22,1,0.36,1),background-color_500ms_ease,transform_180ms_ease-out,filter_180ms_ease-out]',
              'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-400 motion-safe:[animation-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-safe:[animation-fill-mode:backwards]',
            )}
            style={{
              left: `${(x0 / BASE_W) * 100}%`,
              top: `${(y0 / baseH) * 100}%`,
              width: `${((x1 - x0) / BASE_W) * 100}%`,
              height: `${((y1 - y0) / baseH) * 100}%`,
              backgroundColor: bg,
              color: textColor,
              gap: small ? 0 : 2,
              padding: '4px 6px',
              boxShadow: isSelected ? 'inset 0 0 0 3px var(--foreground)' : undefined,
              animationDelay: `${Math.min(i * 22, 400)}ms`,
            }}
          >
            <span
              className="max-w-full overflow-hidden font-semibold leading-[1.2] break-keep"
              style={{
                fontSize: nameSize,
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: singleLine || splitName ? 1 : 2,
              }}
            >
              {splitName ? mainName : theme.name}
            </span>
            {splitName && (
              <span
                className="max-w-full overflow-hidden font-medium leading-[1.2] break-keep text-ellipsis whitespace-nowrap"
                style={{ fontSize: Math.max(11, nameSize - 3) }}
              >
                {parenName}
              </span>
            )}
            {showPct && (
              <span
                className="font-mono font-medium"
                style={{ fontSize: pctSize, letterSpacing: '-0.3px' }}
              >
                {pctText}
                {inlineDetail && <span className="ml-1.5 font-normal">{inlineDetail}</span>}
              </span>
            )}
            {showDetail && detail && (
              <span
                className="block max-w-full overflow-hidden font-mono text-ellipsis whitespace-nowrap"
                style={{ fontSize: Math.max(11, pctSize - 1) }}
              >
                {detail}
              </span>
            )}
          </button>
        )
      })}
      </div>
    </div>
  )
}
