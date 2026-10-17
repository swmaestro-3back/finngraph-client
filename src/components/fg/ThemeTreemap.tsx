import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy'
import { formatChange } from '@/lib/format'
import {
  TILE_ENTER_MS,
  TILE_REFLOW_EASE,
  TILE_REFLOW_HOLD_MS,
  TILE_REFLOW_MS,
  TILE_TYPE,
  enteringIds,
  tileEnterDelay,
  tileText,
  type MeasureText,
  type ThemeTileModel,
  type TileFont,
  type TileText,
} from '@/lib/fg/themes'
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
const TABULAR_SLACK = 1.04
const FIT_SLACK = 1
const TILE_FONTS: readonly TileFont[] = Object.values(TILE_TYPE).flatMap((type) => Object.values(type))
const REFLOW_ARM_MS = 10000
const REFLOW_VARS = {
  '--fg-tmap-reflow': `${TILE_REFLOW_MS}ms`,
  '--fg-tmap-enter': `${TILE_ENTER_MS}ms`,
  '--fg-tmap-ease': TILE_REFLOW_EASE,
} as CSSProperties

function fontFamily(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim() || 'sans-serif'
}

function cssFont(font: TileFont, family: string): string {
  return `${font.weight} ${font.size}px ${family}`
}

function fontStyle(font: TileFont): CSSProperties {
  return { fontWeight: font.weight, fontSize: font.size, lineHeight: `${font.line}px` }
}

function canvasMeasure(): MeasureText {
  const ctx = document.createElement('canvas').getContext('2d')
  const family = fontFamily()
  const cache = new Map<string, number>()
  return (text, font) => {
    const key = `${font.weight}/${font.size}/${font.tabular ? 't' : 'p'}/${text}`
    const hit = cache.get(key)
    if (hit !== undefined) return hit
    let width = [...text].length * font.size
    if (ctx) {
      ctx.font = cssFont(font, family)
      width = font.tabular
        ? ctx.measureText(text.replace(/[0-9]/g, '0')).width * TABULAR_SLACK
        : ctx.measureText(text).width
    }
    const result = width + FIT_SLACK
    cache.set(key, result)
    return result
  }
}

function useTileMeasure(text: string): MeasureText {
  const [measure, setMeasure] = useState<MeasureText>(canvasMeasure)
  useEffect(() => {
    const fonts = document.fonts
    if (!fonts || !text) return
    let live = true
    const renew = () => {
      if (live) setMeasure(() => canvasMeasure())
    }
    const family = fontFamily()
    Promise.all(TILE_FONTS.map((font) => fonts.load(cssFont(font, family), text))).then(renew, () => {})
    fonts.addEventListener('loadingdone', renew)
    return () => {
      live = false
      fonts.removeEventListener('loadingdone', renew)
    }
  }, [text])
  return measure
}

interface Reflow {
  seq: number
  entering: ReadonlySet<number>
}

function useReflow(layoutKey: string, tiles: readonly ThemeTileModel[]): Reflow | null {
  const [seenKey, setSeenKey] = useState(layoutKey)
  const [seenTiles, setSeenTiles] = useState(tiles)
  const [armed, setArmed] = useState(false)
  const [reflow, setReflow] = useState<Reflow | null>(null)
  let arming = armed
  if (layoutKey !== seenKey) {
    setSeenKey(layoutKey)
    setArmed(true)
    arming = true
  }
  if (tiles !== seenTiles) {
    setSeenTiles(tiles)
    if (arming) {
      setArmed(false)
      setReflow({ seq: (reflow?.seq ?? 0) + 1, entering: enteringIds(seenTiles, tiles) })
    }
  }
  useEffect(() => {
    if (!armed) return
    const timer = window.setTimeout(() => setArmed(false), REFLOW_ARM_MS)
    return () => window.clearTimeout(timer)
  }, [armed])
  useEffect(() => {
    if (!reflow) return
    const timer = window.setTimeout(() => setReflow(null), TILE_REFLOW_HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [reflow])
  return reflow
}

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
  layoutKey: string
}

export function ThemeTreemap({ tiles, selectedId, onSelect, label, layoutKey }: ThemeTreemapProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<Size | null>(null)
  const [stops] = useState(readStops)
  const glyphs = useMemo(
    () =>
      [...new Set(tiles.map((tile) => `${tile.name}${formatChange(tile.change)}${tile.detail ?? ''}…`).join(''))]
        .sort()
        .join(''),
    [tiles],
  )
  const measure = useTileMeasure(glyphs)
  const reflow = useReflow(layoutKey, tiles)

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
      .map((leaf) => {
        const tile = leaf.data as ThemeTileModel
        const left = Math.round(leaf.x0)
        const top = Math.round(leaf.y0)
        const width = Math.round(leaf.x1) - left
        const height = Math.round(leaf.y1) - top
        const change = formatChange(tile.change)
        const text = tileText(width, height, { name: tile.name, change, detail: tile.detail }, measure)
        return { tile, left, top, width, height, change, text }
      })
  }, [size, tiles, measure])

  return (
    <div
      ref={ref}
      className="fg-tmap fg-reveal"
      role="group"
      aria-label={label}
      data-reflow={reflow ? '' : undefined}
      style={REFLOW_VARS}
    >
      {nodes.map(({ tile, left, top, width, height, change, text }, index) => {
        const colors = paint(tile.change, stops)
        const entering = reflow?.entering.has(tile.id) ?? false
        return (
          <button
            key={tile.id}
            type="button"
            className="fg-tile"
            data-grade={text?.grade ?? 'xs'}
            data-flat={colors ? undefined : 'true'}
            data-dark={colors?.color === WHITE_INK ? 'true' : undefined}
            data-enter={entering ? '' : undefined}
            aria-pressed={tile.id === selectedId}
            aria-label={tile.label}
            title={tile.label}
            onClick={() => onSelect(tile.id)}
            style={{
              left,
              top,
              width,
              height,
              background: colors?.background,
              color: colors?.color,
              animationDelay: entering ? `${tileEnterDelay(index)}ms` : undefined,
            }}
          >
            {text && <TileLabel text={text} change={change} detail={tile.detail} />}
          </button>
        )
      })}
    </div>
  )
}

function TileLabel({ text, change, detail }: { text: TileText; change: string; detail: string | null }) {
  const type = TILE_TYPE[text.grade]
  return (
    <>
      <span
        className="fg-tile__name"
        data-fit={text.nameFit}
        style={{ ...fontStyle(type.name), WebkitLineClamp: text.nameLines }}
      >
        {text.name}
      </span>
      {text.sub && (
        <span className="fg-tile__sub" style={fontStyle(type.sub)}>
          {text.sub}
        </span>
      )}
      {text.change && (
        <span className="fg-tile__row">
          <span className="fg-tile__chg fg-num" style={fontStyle(type.change)}>
            {change}
          </span>
          {text.detail === 'inline' && detail && (
            <span className="fg-tile__detail fg-num" style={fontStyle(type.detail)}>
              {detail}
            </span>
          )}
        </span>
      )}
      {text.detail === 'line' && detail && (
        <span className="fg-tile__detail fg-num" style={fontStyle(type.detail)}>
          {detail}
        </span>
      )}
    </>
  )
}
