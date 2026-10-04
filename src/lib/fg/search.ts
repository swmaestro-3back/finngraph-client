import type { StockRowRes, ThemeRes } from '@/lib/apiTypes'
import { marketLabel } from '@/lib/fg/format'
import { stockPath, themePath } from '@/lib/fg/paths'

type SearchStock = Pick<StockRowRes, 'ticker' | 'name' | 'market'>
type SearchTheme = Pick<ThemeRes, 'id' | 'name'>

export const SEARCH_GROUP_LIMIT = 5

export interface SearchOption {
  key: string
  group: 'stock' | 'theme'
  label: string
  meta: string
  to: string
}

export function searchOptions(
  rawQuery: string,
  stocks: readonly SearchStock[],
  themes: readonly SearchTheme[],
): SearchOption[] {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return []
  const exact: SearchStock[] = []
  const prefix: SearchStock[] = []
  const partial: SearchStock[] = []
  for (const stock of stocks) {
    const name = stock.name.toLowerCase()
    const ticker = stock.ticker.toLowerCase()
    if (name === q || ticker === q) exact.push(stock)
    else if (name.startsWith(q) || ticker.startsWith(q)) prefix.push(stock)
    else if (name.includes(q) || ticker.includes(q)) partial.push(stock)
  }
  const stockOptions = [...exact, ...prefix, ...partial].slice(0, SEARCH_GROUP_LIMIT).map(
    (stock): SearchOption => ({
      key: `stock:${stock.ticker}`,
      group: 'stock',
      label: stock.name,
      meta: [stock.ticker, marketLabel(stock.market)].filter(Boolean).join(' · '),
      to: stockPath(stock.ticker),
    }),
  )
  const themeOptions = themes
    .filter((theme) => theme.name.toLowerCase().includes(q))
    .slice(0, SEARCH_GROUP_LIMIT)
    .map(
      (theme): SearchOption => ({
        key: `theme:${theme.id}`,
        group: 'theme',
        label: theme.name,
        meta: '테마',
        to: themePath(theme.id),
      }),
    )
  return [...stockOptions, ...themeOptions]
}

export type SearchKeyAction =
  | { type: 'open'; index: number }
  | { type: 'move'; index: number }
  | { type: 'go'; index: number }
  | { type: 'close' }
  | { type: 'none' }

interface SearchKey {
  key: string
  isComposing: boolean
  keyCode: number
}

interface SearchList {
  open: boolean
  active: number
  count: number
}

export function searchKeyAction({ key, isComposing, keyCode }: SearchKey, { open, active, count }: SearchList): SearchKeyAction {
  if (isComposing || keyCode === 229) return { type: 'none' }
  if (key === 'Escape') return { type: 'close' }
  if (count === 0) return { type: 'none' }
  if (!open) return key === 'ArrowDown' ? { type: 'open', index: 0 } : { type: 'none' }
  if (key === 'ArrowDown') return { type: 'move', index: (active + 1) % count }
  if (key === 'ArrowUp') return { type: 'move', index: (active - 1 + count) % count }
  if (key === 'Enter') return { type: 'go', index: Math.min(Math.max(active, 0), count - 1) }
  return { type: 'none' }
}

interface ShortcutEvent {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  isComposing: boolean
}

interface ShortcutTarget {
  tagName?: string
  isContentEditable?: boolean
}

export function isSearchShortcut(event: ShortcutEvent, target: ShortcutTarget | null): boolean {
  if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return false
  if (!target) return true
  const tag = (target.tagName ?? '').toUpperCase()
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return false
  return target.isContentEditable !== true
}
