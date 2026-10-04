export type TreemapDirection = 'up' | 'down'

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

export function mixColor(dir: 'up' | 'down', t: number): { bg: string; k: number; rgb: number[] } {
  const k = Math.min(1, Math.max(0.12, t))
  const [a, b] = STOPS[dir]
  const rgb = a.map((v, i) => Math.round(v + (b[i] - v) * k))
  return { bg: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`, k, rgb }
}

export function treemapTileColor(dir: TreemapDirection, t: number): string {
  return mixColor(dir, t).bg
}

const TINTED_INK = { up: [122, 15, 24], down: [11, 42, 107] } as const
const PAPER_INK = [10, 11, 13] as const
const WHITE = [255, 255, 255] as const
const AA_TEXT = 4.5

function channel(value: number): number {
  const s = value / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(rgb: readonly number[]): number {
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2])
}

export function contrastRatio(a: readonly number[], b: readonly number[]): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export function tileInk(rgb: readonly number[], dir: TreemapDirection): string {
  const tinted = TINTED_INK[dir]
  const pick =
    contrastRatio(WHITE, rgb) >= AA_TEXT
      ? WHITE
      : contrastRatio(tinted, rgb) >= AA_TEXT
        ? tinted
        : PAPER_INK
  return `rgb(${pick[0]},${pick[1]},${pick[2]})`
}

export const COLOR_SATURATION_PCT = 5
export const MAX_TILE_SHARE = 0.25
const MIN_TILE_CHANGE = 0.5

export function changeStrength(change: number): number {
  return Math.min(1, Math.abs(change) / COLOR_SATURATION_PCT)
}

export function hasTurnoverRatio(ratio: number | null | undefined): ratio is number {
  return typeof ratio === 'number' && Number.isFinite(ratio) && ratio >= 0
}

export function tileSize(change: number | null | undefined): number {
  return Math.max(Math.abs(change ?? 0), MIN_TILE_CHANGE)
}

export function capSizes(sizes: number[], share = MAX_TILE_SHARE): number[] {
  const capped = [...sizes]
  for (let round = 0; round < capped.length; round++) {
    const total = capped.reduce((sum, v) => sum + v, 0)
    const index = capped.indexOf(Math.max(...capped))
    const limit = (share / (1 - share)) * (total - capped[index])
    if (capped[index] <= limit) break
    capped[index] = limit
  }
  return capped
}

const MIN_TILE_SHARE_TOTAL = 0.6
const NORMALIZE_ROUNDS = 40

export function normalizeSizes(sizes: number[], maxShare = MAX_TILE_SHARE): number[] {
  const n = sizes.length
  if (n === 0) return []
  const max = Math.max(maxShare, 1 / n)
  const min = Math.min(MIN_TILE_SHARE_TOTAL / n, max)
  let shares = [...sizes]
  for (let round = 0; round < NORMALIZE_ROUNDS; round++) {
    const total = shares.reduce((sum, v) => sum + v, 0)
    if (total <= 0) return sizes.map(() => 1 / n)
    const next = shares.map((v) => Math.min(max, Math.max(min, v / total)))
    const moved = next.some((v, i) => Math.abs(v - shares[i] / total) > 1e-6)
    shares = next
    if (!moved) break
  }
  return shares
}

export type Rgb = readonly [number, number, number]

export function parseHexColor(value: string): Rgb | null {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim())
  if (!match) return null
  const n = Number.parseInt(match[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function mixRgb(from: Rgb, to: Rgb, k: number): Rgb {
  const t = Math.min(1, Math.max(0, k))
  const at = (i: 0 | 1 | 2) => Math.round(from[i] + (to[i] - from[i]) * t)
  return [at(0), at(1), at(2)]
}

export function rgbText(rgb: readonly number[]): string {
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
}
