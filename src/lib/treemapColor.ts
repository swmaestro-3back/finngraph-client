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

export function shade(rgb: number[], amt: number): string {
  const target = amt > 0 ? 255 : 0
  const f = Math.abs(amt)
  const [r, g, b] = rgb.map((v) => Math.round(v + (target - v) * f))
  return `rgb(${r},${g},${b})`
}

export function treemapTileColor(dir: TreemapDirection, t: number): string {
  return mixColor(dir, t).bg
}
