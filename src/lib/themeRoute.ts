import { themePath } from '@/lib/fg/paths'
import type { ThemeRes } from '@/lib/apiTypes'

export type ThemeIdIndex = Map<string, number>

export type NamedTheme = Pick<ThemeRes, 'id' | 'name'>

function key(name: string): string {
  return name.trim().toLowerCase()
}

export function themeIdIndex(themes: readonly NamedTheme[]): ThemeIdIndex {
  const index: ThemeIdIndex = new Map()
  for (const theme of themes) {
    const k = key(theme.name)
    if (!index.has(k)) index.set(k, theme.id)
  }
  return index
}

export function themeDetailPath(name: string, index: ThemeIdIndex | null): string | null {
  const id = index?.get(key(name))
  return id === undefined ? null : themePath(id)
}
