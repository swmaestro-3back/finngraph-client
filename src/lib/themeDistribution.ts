import type { NewsDetail, ThemeIndexCandleRes, ThemeRes, ThemeStockRes } from '@/lib/apiTypes'
import { formatChange } from '@/lib/format'
import { assignNewsToDays } from '@/lib/moves'

export type ThemePeriod = 'today' | '1w' | '1m' | '3m'

export const THEME_PERIODS: { key: ThemePeriod; label: string }[] = [
  { key: 'today', label: '오늘' },
  { key: '1w', label: '1주' },
  { key: '1m', label: '1달' },
  { key: '3m', label: '3달' },
]

export const THEME_MOVE_WINDOW = 60
export const THEME_MOVE_LIMIT = 20
export const THEME_MOVE_CHANGE = 3
export const THEME_MOVE_VALUE_MULTIPLE = 2
export const THEME_VALUE_BASE_DAYS = 20

export const NO_THEME_INDEX_TEXT = '테마 지수가 아직 쌓이지 않았습니다'
export const NO_THEME_MOVES_TEXT = '최근 60거래일 동안 테마 지수의 큰 움직임이 없었습니다'
export const THEME_NO_NEWS_DETAIL = '수집된 뉴스가 없습니다'
export const THEME_MOVE_CRITERIA_TEXT = '최근 60거래일 · 지수 등락률 ±3% 이상, 거래대금 평소의 2배 이상'

export function periodLabel(period: ThemePeriod): string {
  return THEME_PERIODS.find((p) => p.key === period)?.label ?? ''
}

export function stockPeriodValue(stock: ThemeStockRes, period: ThemePeriod): number | null {
  switch (period) {
    case 'today':
      return stock.change ?? null
    case '1w':
      return stock.r1w ?? null
    case '1m':
      return stock.r1m ?? null
    case '3m':
      return stock.r3m ?? null
  }
}

export function themePeriodValue(theme: Pick<ThemeRes, 'change' | 'w1' | 'm1' | 'm3'>, period: ThemePeriod): number | null {
  switch (period) {
    case 'today':
      return theme.change ?? null
    case '1w':
      return theme.w1 ?? null
    case '1m':
      return theme.m1 ?? null
    case '3m':
      return theme.m3 ?? null
  }
}

export interface RankedStock {
  stock: ThemeStockRes
  value: number
}

export function rankedStocks(stocks: ThemeStockRes[], period: ThemePeriod): { ranked: RankedStock[]; missing: number } {
  const ranked: RankedStock[] = []
  let missing = 0
  for (const stock of stocks) {
    const value = stockPeriodValue(stock, period)
    if (value === null || !Number.isFinite(value)) missing += 1
    else ranked.push({ stock, value })
  }
  ranked.sort((a, b) => b.value - a.value || (b.stock.marketCap ?? 0) - (a.stock.marketCap ?? 0))
  return { ranked, missing }
}

export function topMovers(ranked: RankedStock[], count = 3): { gainers: RankedStock[]; losers: RankedStock[] } {
  return {
    gainers: ranked.filter((r) => r.value > 0).slice(0, count),
    losers: ranked
      .filter((r) => r.value < 0)
      .sort((a, b) => a.value - b.value)
      .slice(0, count),
  }
}

export function defaultPreview(ranked: RankedStock[]): string | null {
  if (ranked.length === 0) return null
  const top = ranked[0]
  if (top.value > 0) return top.stock.ticker
  const widest = ranked.reduce((best, r) => (Math.abs(r.value) > Math.abs(best.value) ? r : best), ranked[0])
  return widest.stock.ticker
}

function largestCap(ranked: RankedStock[]): RankedStock | null {
  return ranked.reduce<RankedStock | null>(
    (best, r) => (best === null || (r.stock.marketCap ?? 0) > (best.stock.marketCap ?? 0) ? r : best),
    null,
  )
}

export interface Breadth {
  up: number
  down: number
  flat: number
}

export function breadthOf(ranked: RankedStock[]): Breadth {
  return {
    up: ranked.filter((r) => r.value > 0).length,
    down: ranked.filter((r) => r.value < 0).length,
    flat: ranked.filter((r) => r.value === 0).length,
  }
}

export function distributionSummary(ranked: RankedStock[]): string | null {
  if (ranked.length === 0) return null
  const { up, down, flat } = breadthOf(ranked)
  const counts = `${ranked.length}종목 중 ${up}개 상승 · ${down}개 하락${flat > 0 ? ` · ${flat}개 보합` : ''}`
  const lead = up > 0 ? ranked[0] : [...ranked].sort((a, b) => a.value - b.value)[0]
  const leadWord = up > 0 ? '최대 상승' : '최대 하락'
  const cap = largestCap(ranked)
  if (cap === null || cap.stock.ticker === lead.stock.ticker) {
    return `${counts} — ${leadWord}이자 시총 1위 ${lead.stock.name} ${formatChange(lead.value)}`
  }
  return `${counts} — ${leadWord} ${lead.stock.name} ${formatChange(lead.value)}, 시총 1위 ${cap.stock.name} ${formatChange(cap.value)}`
}

export function labelWidth(text: string): number {
  let width = 0
  for (const ch of text) width += /[ㄱ-힝]/.test(ch) ? 11 : 6.5
  return width
}

export interface DistributionDot {
  ticker: string
  name: string
  value: number
  x: number
  y: number
  r: number
  label: boolean
  labelX: number
  labelY: number
}

export interface DistributionLayout {
  dots: DistributionDot[]
  ticks: { value: number; x: number }[]
  lo: number
  hi: number
  axisY: number
  height: number
  xOf: (value: number) => number
}

export interface LayoutOptions {
  rMin?: number
  rMax?: number
  pad?: number
  gap?: number
  topPad?: number
  labelCount?: number
}

const TICK_STEPS = [0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200]
const MAX_TICKS = 6
const LABEL_HEIGHT = 12
const LABEL_GAP = 4
const AXIS_GAP = 8
const TICK_LABEL_SPACE = 20
const SEARCH_STEP = 1

function niceTicks(lo: number, hi: number): number[] {
  const span = hi - lo
  const step = TICK_STEPS.find((s) => span / s <= MAX_TICKS) ?? TICK_STEPS[TICK_STEPS.length - 1]
  const ticks: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(Number(v.toFixed(6)))
  if (!ticks.some((t) => Math.abs(t) < 1e-9)) ticks.push(0)
  return ticks.sort((a, b) => a - b).map((t) => (Math.abs(t) < 1e-9 ? 0 : t))
}

export function layoutDistribution(ranked: RankedStock[], width: number, options: LayoutOptions = {}): DistributionLayout {
  const rMin = options.rMin ?? 4
  const rMax = options.rMax ?? 16
  const gap = options.gap ?? 1.5
  const topPad = options.topPad ?? LABEL_HEIGHT + LABEL_GAP + 2
  const labelCount = options.labelCount ?? 3
  const pad = options.pad ?? rMax + 4

  const values = ranked.map((r) => r.value)
  const minValue = Math.min(0, ...values)
  const maxValue = Math.max(0, ...values)
  const margin = Math.max(0.5, (maxValue - minValue) * 0.04)
  const lo = minValue - margin
  const hi = maxValue + margin
  const inner = Math.max(1, width - pad * 2)
  const xOf = (value: number) => pad + ((value - lo) / (hi - lo)) * inner

  const capMax = Math.max(1, ...ranked.map((r) => r.stock.marketCap ?? 0))
  const radiusOf = (cap: number | null) => rMin + (rMax - rMin) * Math.sqrt(Math.max(0, cap ?? 0) / capMax)

  const order = [...ranked].sort((a, b) => (b.stock.marketCap ?? 0) - (a.stock.marketCap ?? 0))
  const placed: { r: RankedStock; x: number; y: number; radius: number }[] = []
  for (const r of order) {
    const x = xOf(r.value)
    const radius = radiusOf(r.stock.marketCap)
    let y = 0
    for (let k = 0; k < 4000; k += 1) {
      const offset = Math.ceil(k / 2) * SEARCH_STEP * (k % 2 === 1 ? -1 : 1)
      const candidate = offset
      const hit = placed.some((p) => Math.hypot(p.x - x, p.y - candidate) < p.radius + radius + gap)
      if (!hit) {
        y = candidate
        break
      }
    }
    placed.push({ r, x, y, radius })
  }

  const top = placed.length > 0 ? Math.min(...placed.map((p) => p.y - p.radius)) : 0
  const shift = topPad - top

  const dots: DistributionDot[] = placed.map((p) => ({
    ticker: p.r.stock.ticker,
    name: p.r.stock.name,
    value: p.r.value,
    x: p.x,
    y: p.y + shift,
    r: p.radius,
    label: false,
    labelX: p.x,
    labelY: p.y + shift - p.radius - LABEL_GAP,
  }))

  const byTicker = new Map(dots.map((d) => [d.ticker, d]))
  const priority: string[] = []
  const push = (ticker: string | undefined) => {
    if (ticker && !priority.includes(ticker)) priority.push(ticker)
  }
  push(ranked[0]?.stock.ticker)
  push(largestCap(ranked)?.stock.ticker)
  ;[...ranked].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, labelCount).forEach((r) => push(r.stock.ticker))
  order.slice(0, labelCount).forEach((r) => push(r.stock.ticker))

  type Box = { left: number; right: number; top: number; bottom: number }
  const boxes: Box[] = []
  const free = (box: Box, self: string) =>
    box.top >= 0 &&
    !boxes.some((b) => box.left < b.right && b.left < box.right && box.top < b.bottom && b.top < box.bottom) &&
    !dots.some(
      (d) =>
        d.ticker !== self &&
        d.x + d.r > box.left &&
        d.x - d.r < box.right &&
        d.y + d.r > box.top &&
        d.y - d.r < box.bottom,
    )

  for (const ticker of priority) {
    const dot = byTicker.get(ticker)
    if (!dot) continue
    const w = labelWidth(dot.name)
    if (w > width) continue
    const labelX = Math.min(Math.max(dot.x, w / 2), width - w / 2)
    const above = dot.y - dot.r - LABEL_GAP
    const below = dot.y + dot.r + LABEL_GAP + LABEL_HEIGHT
    const baseline = [above, below].find((y) =>
      free({ left: labelX - w / 2, right: labelX + w / 2, top: y - LABEL_HEIGHT, bottom: y }, dot.ticker),
    )
    if (baseline === undefined) continue
    boxes.push({ left: labelX - w / 2, right: labelX + w / 2, top: baseline - LABEL_HEIGHT, bottom: baseline })
    dot.label = true
    dot.labelX = labelX
    dot.labelY = baseline
  }

  const dotBottom = dots.length > 0 ? Math.max(...dots.map((d) => d.y + d.r)) : topPad + rMax * 2
  const labelBottom = boxes.length > 0 ? Math.max(...boxes.map((b) => b.bottom)) : 0
  const axisY = Math.max(dotBottom, labelBottom) + AXIS_GAP
  const height = axisY + TICK_LABEL_SPACE

  return {
    dots,
    ticks: niceTicks(lo, hi).map((value) => ({ value, x: xOf(value) })),
    lo,
    hi,
    axisY,
    height,
    xOf,
  }
}

export interface RenderedLabel {
  ticker: string
  name: string
  x: number
  y: number
}

type LabelBox = { left: number; right: number; top: number; bottom: number }

function labelBox(x: number, name: string, baseline: number): LabelBox {
  const w = labelWidth(name)
  return { left: x - w / 2, right: x + w / 2, top: baseline - LABEL_HEIGHT, bottom: baseline }
}

function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

export function renderedLabels(layout: DistributionLayout, selected: string | null, width: number): RenderedLabel[] {
  const base = layout.dots.filter((d) => d.label).map((d) => ({ ticker: d.ticker, name: d.name, x: d.labelX, y: d.labelY }))
  if (selected === null) return base
  const dot = layout.dots.find((d) => d.ticker === selected)
  if (!dot || dot.label) return base
  const w = labelWidth(dot.name)
  const x = Math.min(Math.max(dot.x, w / 2), Math.max(w / 2, width - w / 2))
  const candidates = [dot.y - dot.r - LABEL_GAP, dot.y + dot.r + LABEL_GAP + LABEL_HEIGHT]
  const clearOfDots = (box: LabelBox) =>
    !layout.dots.some(
      (d) => d.ticker !== dot.ticker && d.x + d.r > box.left && d.x - d.r < box.right && d.y + d.r > box.top && d.y - d.r < box.bottom,
    )
  const y =
    candidates.find((c) => c - LABEL_HEIGHT >= 0 && c <= layout.axisY - 2 && clearOfDots(labelBox(x, dot.name, c))) ?? candidates[0]
  const mine = labelBox(x, dot.name, y)
  const kept = base.filter((l) => !boxesOverlap(labelBox(l.x, l.name, l.y), mine))
  return [...kept, { ticker: dot.ticker, name: dot.name, x, y }]
}

export interface ThemeMove {
  date: string
  change: number | null
  valueRatio: number | null
  news: NewsDetail[]
}

export function themeMoves(candles: ThemeIndexCandleRes[], news: NewsDetail[]): ThemeMove[] {
  if (candles.length === 0) return []
  const sorted = [...candles].sort((a, b) => a.date.localeCompare(b.date))
  const newsBySlot = assignNewsToDays(
    sorted.map((c) => c.date),
    news,
  )
  const moves: ThemeMove[] = []
  const from = Math.max(1, sorted.length - THEME_MOVE_WINDOW)
  for (let i = from; i < sorted.length; i += 1) {
    const candle = sorted[i]
    const prev = sorted[i - 1].close
    const change = prev > 0 ? ((candle.close - prev) / prev) * 100 : null
    const base = sorted
      .slice(Math.max(0, i - THEME_VALUE_BASE_DAYS), i)
      .map((c) => c.tradeValue)
      .filter((v): v is number => v !== null && v > 0)
    const average = base.length > 0 ? base.reduce((sum, v) => sum + v, 0) / base.length : 0
    const valueRatio = candle.tradeValue !== null && average > 0 ? candle.tradeValue / average : null
    const big = change !== null && Math.abs(change) >= THEME_MOVE_CHANGE - 1e-9
    const heavy = valueRatio !== null && valueRatio >= THEME_MOVE_VALUE_MULTIPLE - 1e-9
    if (!big && !heavy) continue
    moves.push({ date: candle.date, change, valueRatio, news: newsBySlot[i] })
  }
  return moves.reverse().slice(0, THEME_MOVE_LIMIT)
}
