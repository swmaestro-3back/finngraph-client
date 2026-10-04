import { useEffect, useMemo, useRef, useState } from 'react'
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy'
import { formatChange } from '@/lib/format'
import { tileGrade, type ThemeTileModel } from '@/lib/fg/themes'
import { changeStrength, mixColor, mixRgb, parseHexColor, rgbText, tileInk, type Rgb } from '@/lib/treemapColor'

interface TileStops {
  up: readonly [Rgb, Rgb]
  down: readonly [Rgb, Rgb]
}

interface Size {
  width: number
  height: number
}

type Datum = { children?: readonly ThemeTileModel[] } & Partial<ThemeTileModel>

const WHITE_INK = 'rgb(255,255,255)'

function readStops(): TileStops | null {
  const style = getComputedStyle(document.documentElement)
  const read = (name: string) => parseHexColor(style.getPropertyValue(name))
  const upFrom = read('--market-up-subtle')
  const upTo = read('--market-up-strong')
  const downFrom = read('--market-down-subtle')
  const downTo = read('--market-down')
  if (!upFrom || !upTo || !downFrom || !downTo) return null
  return { up: [upFrom, upTo], down: [downFrom, downTo] }
}

function paint(change: number, stops: TileStops | null): { background: string; color: string } | null {
  if (change === 0) return null
  const dir = change > 0 ? 'up' : 'down'
  const k = changeStrength(change)
  const rgb = stops ? mixRgb(stops[dir][0], stops[dir][1], k) : mixColor(dir, k).rgb
  return { background: rgbText(rgb), color: tileInk(rgb, dir) }
}

interface ThemeTreemapProps {
  tiles: readonly ThemeTileModel[]
  selectedId: number | null
  onSelect: (id: number) => void
  label: string
}

export function ThemeTreemap({ tiles, selectedId, onSelect, label }: ThemeTreemapProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<Size | null>(null)
  const [stops] = useState(readStops)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width)
      const height = Math.round(entry.contentRect.height)
      setSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const nodes = useMemo(() => {
    if (!size || size.width === 0 || size.height === 0 || tiles.length === 0) return []
    const root = hierarchy<Datum>({ children: tiles })
      .sum((d) => d.size ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    return treemap<Datum>()
      .tile(treemapSquarify)
      .size([size.width, size.height])(root)
      .leaves()
      .map((leaf) => ({
        tile: leaf.data as ThemeTileModel,
        left: Math.round(leaf.x0),
        top: Math.round(leaf.y0),
        width: Math.round(leaf.x1) - Math.round(leaf.x0),
        height: Math.round(leaf.y1) - Math.round(leaf.y0),
      }))
  }, [size, tiles])

  return (
    <div ref={ref} className="fg-tmap fg-reveal" role="group" aria-label={label}>
      {nodes.map(({ tile, left, top, width, height }) => {
        const colors = paint(tile.change, stops)
        return (
          <button
            key={tile.id}
            type="button"
            className="fg-tile"
            data-grade={tileGrade(width, height)}
            data-flat={colors ? undefined : 'true'}
            data-dark={colors?.color === WHITE_INK ? 'true' : undefined}
            aria-pressed={tile.id === selectedId}
            aria-label={tile.label}
            title={tile.label}
            onClick={() => onSelect(tile.id)}
            style={{ left, top, width, height, background: colors?.background, color: colors?.color }}
          >
            <span className="fg-tile__name">{tile.name}</span>
            <span className="fg-tile__chg fg-num">{formatChange(tile.change)}</span>
            {tile.detail && <span className="fg-tile__detail fg-num">{tile.detail}</span>}
          </button>
        )
      })}
    </div>
  )
}
