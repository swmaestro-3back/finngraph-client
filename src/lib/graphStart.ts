import type { GraphFocus } from '@/data/graphTypes'
import type { FavoriteItemRes, StockRowRes } from '@/lib/apiTypes'
import { MOVER_UNIVERSE, pickMovers } from '@/lib/fg/hub'

export interface GraphPick {
  focus: GraphFocus
  label: string
  change?: number | null
}

const RECENT_KEY = 'fg.graph.recent'
const GUIDE_KEY = 'fg.graph.guide'
const RECENT_LIMIT = 5
const FAVORITE_PICKS = 4
const MOVER_PICKS = 3

export const EXAMPLE_SLUG = 'example'
export const EXAMPLE_PATH = `/graph/${EXAMPLE_SLUG}`
export const EXAMPLE_TICKER = '005930'
export const EXAMPLE_BASIS = '2026년 10월 기준'

export const STARTER_PICKS: readonly GraphPick[] = [
  { focus: { kind: 'company', ticker: '005930' }, label: '삼성전자' },
  { focus: { kind: 'company', ticker: '000660' }, label: 'SK하이닉스' },
  { focus: { kind: 'company', ticker: '005380' }, label: '현대차' },
]

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    return
  }
}

export function pickKey(focus: GraphFocus): string {
  return focus.kind === 'theme' ? `theme:${focus.name}` : `company:${focus.ticker}`
}

function isPick(value: unknown): value is GraphPick {
  if (typeof value !== 'object' || value === null) return false
  const { focus, label } = value as Partial<GraphPick>
  if (typeof label !== 'string' || typeof focus !== 'object' || focus === null) return false
  if (focus.kind === 'company') return typeof focus.ticker === 'string'
  return focus.kind === 'theme' && typeof focus.name === 'string'
}

export function loadRecentPicks(): GraphPick[] {
  const raw = readStorage(RECENT_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter(isPick).map(({ focus, label }) => ({ focus, label })).slice(0, RECENT_LIMIT)
      : []
  } catch {
    return []
  }
}

export function rememberPick(pick: GraphPick): void {
  const key = pickKey(pick.focus)
  const rest = loadRecentPicks().filter((p) => pickKey(p.focus) !== key)
  const next = [{ focus: pick.focus, label: pick.label }, ...rest].slice(0, RECENT_LIMIT)
  writeStorage(RECENT_KEY, JSON.stringify(next))
}

export function fallbackPick(recent: readonly GraphPick[]): GraphPick {
  return recent[0] ?? STARTER_PICKS[0]
}

export function guideSeen(): boolean {
  return readStorage(GUIDE_KEY) === 'seen'
}

export function markGuideSeen(): void {
  writeStorage(GUIDE_KEY, 'seen')
}

export function moverPicks(rows: readonly StockRowRes[]): GraphPick[] {
  return pickMovers(rows, MOVER_UNIVERSE, MOVER_PICKS).map((row) => ({
    focus: { kind: 'company', ticker: row.ticker },
    label: row.name,
    change: row.change,
  }))
}

export function favoritePicks(items: readonly FavoriteItemRes[]): GraphPick[] {
  const picks: GraphPick[] = []
  for (const item of items) {
    if (item.stock) picks.push({ focus: { kind: 'company', ticker: item.stock.ticker }, label: item.stock.name })
    else if (item.theme) picks.push({ focus: { kind: 'theme', name: item.theme.name }, label: item.theme.name })
    if (picks.length === FAVORITE_PICKS) break
  }
  return picks
}
