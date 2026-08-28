import { useEffect, useMemo, useRef, useState } from 'react'
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy'
import { formatChange } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ThemeItem } from '@/data/themes'

const BASE_W = 1136
const BASE_H = 520
const DESIGN_W = 1200
const DESIGN_H = 520

const STOPS = {
  up: [
    [255, 240, 241],
    [176, 22, 33],
  ],
  down: [
    [235, 242, 255],
    [0, 58, 176],
  ],
} as const

function mixColor(dir: 'up' | 'down', t: number): { bg: string; k: number; rgb: number[] } {
  const k = Math.min(1, Math.max(0.12, t))
  const [a, b] = STOPS[dir]
  const rgb = a.map((v, i) => Math.round(v + (b[i] - v) * k))
  return { bg: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`, k, rgb }
}

function shade(rgb: number[], amt: number): string {
  const target = amt > 0 ? 255 : 0
  const f = Math.abs(amt)
  const [r, g, b] = rgb.map((v) => Math.round(v + (target - v) * f))
  return `rgb(${r},${g},${b})`
}

interface TreemapProps {
  items: ThemeItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  className?: string
  changeOf?: (item: ThemeItem) => number
}

export function Treemap({ items, selectedId, onSelect, className, changeOf }: TreemapProps) {
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

  const { nodes, maxUp, maxDown } = useMemo(() => {
    type TreeDatum = { children?: ThemeItem[] } & Partial<ThemeItem>
    const root = hierarchy<TreeDatum>({ children: items })
      .sum((d) => d.tradingValue ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    const layout = treemap<TreeDatum>().tile(treemapSquarify).size([BASE_W, BASE_H]).paddingInner(3)

    const leaves = layout(root)
      .leaves()
      .map((leaf) => {
        const theme = leaf.data as ThemeItem
        const topStock = [...theme.stocks].sort((a, b) => b.change - a.change)[0]
        const change = changeOf ? changeOf(theme) : theme.change
        return { theme, change, topStock, x0: leaf.x0, y0: leaf.y0, x1: leaf.x1, y1: leaf.y1 }
      })

    const changes = items.map((t) => (changeOf ? changeOf(t) : t.change))
    return {
      nodes: leaves,
      maxUp: Math.max(...changes.filter((c) => c > 0), 0.01),
      maxDown: Math.max(...changes.filter((c) => c < 0).map((c) => Math.abs(c)), 0.01),
    }
  }, [items, changeOf])

  const scale = renderWidth / BASE_W
  const scaleY = renderWidth / DESIGN_W

  return (
    <div className={cn('pb-3', className)}>
      <div
        ref={containerRef}
        className="relative w-full rounded-2xl bg-surface-inset"
        style={{ aspectRatio: `${DESIGN_W} / ${DESIGN_H}` }}
      >
      {nodes.map(({ theme, change, topStock, x0, y0, x1, y1 }, i) => {
        const w = (x1 - x0) * scale
        const h = (y1 - y0) * scaleY
        const dir = change >= 0 ? 'up' : 'down'
        const t = Math.abs(change) / (dir === 'up' ? maxUp : maxDown)
        const { bg, k, rgb } = mixColor(dir, t)
        const depth = 3 + Math.round(k * 6)
        const blockShadows = [
          `0 ${depth}px 0 ${shade(rgb, -0.32)}`,
          `0 ${depth + 5}px 10px rgba(10,11,13,0.14)`,
        ]
        const textColor = k > 0.42 ? '#ffffff' : dir === 'up' ? '#7a0f18' : '#0b2a6b'
        const isSelected = theme.id === selectedId

        const small = h < 40 || w < 72
        const nameSize = small ? 11 : w < 130 ? 13 : w < 200 ? 15 : 17
        const pctSize = small ? 9 : w < 130 ? 10 : w < 200 ? 11 : 13
        const showPct = h >= 34 && w >= 46
        const singleLine = h < 56
        const showDetail = h >= 88 && w >= 150

        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => onSelect(theme.id)}
            aria-pressed={isSelected}
            aria-label={`${theme.name} ${formatChange(change)}`}
            className={cn(
              'absolute box-border flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[6px] text-center',
              'focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2',
              'hover:z-10 hover:-translate-y-0.5 hover:brightness-[1.04]',
              'motion-safe:[transition:left_500ms_cubic-bezier(0.22,1,0.36,1),top_500ms_cubic-bezier(0.22,1,0.36,1),width_500ms_cubic-bezier(0.22,1,0.36,1),height_500ms_cubic-bezier(0.22,1,0.36,1),background-color_500ms_ease,box-shadow_500ms_ease,transform_180ms_ease-out,filter_180ms_ease-out]',
              'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-400 motion-safe:[animation-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-safe:[animation-fill-mode:backwards]',
            )}
            style={{
              left: `${(x0 / BASE_W) * 100}%`,
              top: `${(y0 / BASE_H) * 100}%`,
              width: `${((x1 - x0) / BASE_W) * 100}%`,
              height: `${((y1 - y0) / BASE_H) * 100}%`,
              backgroundColor: bg,
              backgroundImage: `linear-gradient(180deg, ${shade(rgb, 0.07)} 0%, ${bg} 40%, ${shade(rgb, -0.07)} 100%)`,
              color: textColor,
              gap: small ? 0 : 2,
              padding: '4px 6px',
              boxShadow: (isSelected
                ? ['inset 0 0 0 3px var(--foreground)', ...blockShadows]
                : blockShadows
              ).join(', '),
              animationDelay: `${Math.min(i * 22, 400)}ms`,
            }}
          >
            <span
              className="max-w-full overflow-hidden font-semibold leading-[1.2] break-keep"
              style={{
                fontSize: nameSize,
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: singleLine ? 1 : 2,
              }}
            >
              {theme.name}
            </span>
            {showPct && (
              <span
                className="font-mono font-medium opacity-95"
                style={{ fontSize: pctSize, letterSpacing: '-0.3px' }}
              >
                {change > 0 ? '+' : '−'}
                {Math.abs(change).toFixed(2)}%
              </span>
            )}
            {showDetail && (
              <span
                className="flex max-w-full items-baseline gap-1.5 overflow-hidden font-mono whitespace-nowrap opacity-75"
                style={{ fontSize: Math.max(9, pctSize - 2) }}
              >
                {theme.tradingValueLabel}
                <span aria-hidden>·</span>
                {topStock.name} {formatChange(topStock.change)}
              </span>
            )}
          </button>
        )
      })}
      </div>
    </div>
  )
}
