import { useEffect, useMemo, useRef, useState } from 'react'
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy'
import { cn } from '@/lib/utils'
import type { ThemeItem } from '@/data/themes'

const BASE_W = 1136
const BASE_H = 520
// 1440px 뷰포트에서의 실제 렌더 크기 — 높이를 이 비율로 폭에 연동한다
const DESIGN_W = 1200
const DESIGN_H = 520

// 컬러 스케일 (design-specs/theme-dashboard.md §2): 선형 보간, k = clamp(t, 0.12, 1)
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

function mixColor(dir: 'up' | 'down', t: number): { bg: string; k: number } {
  const k = Math.min(1, Math.max(0.12, t))
  const [a, b] = STOPS[dir]
  const rgb = a.map((v, i) => Math.round(v + (b[i] - v) * k))
  return { bg: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`, k }
}

interface TreemapProps {
  items: ThemeItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  className?: string
}

export function Treemap({ items, selectedId, onSelect, className }: TreemapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // 실측 렌더 폭 → 셀 픽셀 크기 기반 폰트 계층에 사용
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

    const layout = treemap<TreeDatum>().tile(treemapSquarify).size([BASE_W, BASE_H])

    const leaves = layout(root)
      .leaves()
      .map((leaf) => ({
        theme: leaf.data as ThemeItem,
        x0: leaf.x0,
        y0: leaf.y0,
        x1: leaf.x1,
        y1: leaf.y1,
      }))

    return {
      nodes: leaves,
      maxUp: Math.max(...items.filter((t) => t.change > 0).map((t) => t.change), 0.01),
      maxDown: Math.max(...items.filter((t) => t.change < 0).map((t) => Math.abs(t.change)), 0.01),
    }
  }, [items])

  // x는 레이아웃 캔버스(1136) 기준, y는 렌더 높이(폭 × DESIGN_H/DESIGN_W) 기준 배율
  const scale = renderWidth / BASE_W
  const scaleY = renderWidth / DESIGN_W

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full overflow-hidden rounded-2xl bg-background', className)}
      // 높이도 폭에 비례 (1440px 뷰포트: 1336 × 520)
      style={{ aspectRatio: `${DESIGN_W} / ${DESIGN_H}` }}
    >
      {nodes.map(({ theme, x0, y0, x1, y1 }) => {
        // 폰트/표시 규칙은 실제 렌더 픽셀 기준
        const w = (x1 - x0) * scale
        const h = (y1 - y0) * scaleY
        const dir = theme.change >= 0 ? 'up' : 'down'
        const t = Math.abs(theme.change) / (dir === 'up' ? maxUp : maxDown)
        const { bg, k } = mixColor(dir, t)
        const textColor = k > 0.42 ? '#ffffff' : dir === 'up' ? '#7a0f18' : '#0b2a6b'
        const isSelected = theme.id === selectedId

        // 텍스트 크기 단계 (셀 픽셀 기준)
        const small = h < 44 || w < 84
        const nameSize = small ? 11 : w < 130 ? 13 : w < 200 ? 15 : 17
        const pctSize = small ? 9 : w < 130 ? 10 : w < 200 ? 11 : 13
        const showPct = h >= 52 && w >= 60
        const singleLine = h < 62

        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => onSelect(theme.id)}
            className="absolute box-border flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[6px] border-2 border-white text-center transition-shadow duration-100"
            style={{
              left: `${(x0 / BASE_W) * 100}%`,
              top: `${(y0 / BASE_H) * 100}%`,
              width: `${((x1 - x0) / BASE_W) * 100}%`,
              height: `${((y1 - y0) / BASE_H) * 100}%`,
              backgroundColor: bg,
              color: textColor,
              gap: small ? 0 : 2,
              padding: '4px 6px',
              boxShadow: isSelected ? 'inset 0 0 0 3px #0a0b0d' : undefined,
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
                {theme.change > 0 ? '+' : '−'}
                {Math.abs(theme.change).toFixed(2)}%
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
