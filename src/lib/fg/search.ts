import type { IssueSummaryRes, SearchRes, StockRowRes, ThemeRes } from '@/lib/apiTypes'
import { marketLabel } from '@/lib/fg/format'
import { dayWord } from '@/lib/fg/issueSubject'
import { issuePath, stockPath, themePath } from '@/lib/fg/paths'
import { kstDayTime } from '@/lib/fg/themeNews'

type SearchStock = Pick<StockRowRes, 'ticker' | 'name' | 'market'>
type SearchTheme = Pick<ThemeRes, 'id' | 'name'>

export const SEARCH_GROUP_LIMIT = 5

export type SearchGroup = 'stock' | 'theme' | 'issue'

export const SEARCH_GROUPS: readonly { group: SearchGroup; label: string }[] = [
  { group: 'stock', label: '종목' },
  { group: 'theme', label: '테마' },
  { group: 'issue', label: '이슈' },
]

export interface SearchOption {
  key: string
  group: SearchGroup
  label: string
  alias?: string | null
  ticker?: string
  meta: string
  to: string
}

function stockOption(stock: SearchStock, alias: string | null = null): SearchOption {
  const shown = alias?.trim() || null
  return {
    key: `stock:${stock.ticker}`,
    group: 'stock',
    label: stock.name,
    ticker: stock.ticker,
    alias: shown && shown.toLowerCase() !== stock.name.toLowerCase() ? shown : null,
    meta: [stock.ticker, marketLabel(stock.market)].filter(Boolean).join(' · '),
    to: stockPath(stock.ticker),
  }
}

function themeOption(theme: SearchTheme): SearchOption {
  return {
    key: `theme:${theme.id}`,
    group: 'theme',
    label: theme.name,
    meta: '테마',
    to: themePath(theme.id),
  }
}

function issueOption(issue: IssueSummaryRes, today: string): SearchOption {
  const at = kstDayTime(issue.lastPublishedAt ?? issue.firstPublishedAt ?? '')
  const media = `${issue.mediaCount}개 매체`
  return {
    key: `issue:${issue.id}`,
    group: 'issue',
    label: issue.title?.trim() || '제목 없는 이슈',
    meta: at ? `${dayWord(at.day, today)} · ${media}` : media,
    to: issuePath(String(issue.id)),
  }
}

export function remoteSearchOptions(result: SearchRes, today: string): SearchOption[] {
  return [
    ...result.stocks.map((stock) => stockOption(stock, stock.matchedAlias)),
    ...result.themes.map(themeOption),
    ...result.issues.map((issue) => issueOption(issue, today)),
  ]
}

function hit(text: string | null | undefined, q: string): boolean {
  return (text ?? '').toLowerCase().includes(q)
}

export function narrowSearch(result: SearchRes, rawQuery: string): SearchRes {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return result
  return {
    query: rawQuery.trim(),
    stocks: result.stocks.filter((stock) => hit(stock.name, q) || hit(stock.matchedAlias, q) || hit(stock.ticker, q)),
    themes: result.themes.filter((theme) => hit(theme.name, q)),
    issues: result.issues.filter((issue) => hit(issue.title, q)),
  }
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
  const stockOptions = [...exact, ...prefix, ...partial].slice(0, SEARCH_GROUP_LIMIT).map((stock) => stockOption(stock))
  const themeOptions = themes
    .filter((theme) => theme.name.toLowerCase().includes(q))
    .slice(0, SEARCH_GROUP_LIMIT)
    .map(themeOption)
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
