
import { listNews } from '@/data/newsDetail'
import { getThemeNewsPool } from '@/data/themeNews'
import { hashString } from '@/data/stockMeta'
import { toNewsItem } from '@/lib/apiMappers'

export { toNewsItem }

export interface NewsItem {
  id: string
  title: string
  meta: string
}

export function getThemeNews(themeId: string): NewsItem[] {
  const pool = getThemeNewsPool(themeId)
  if (pool) {
    return [...pool]
      .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))
      .map(toNewsItem)
  }

  const all = listNews()
  if (all.length === 0) return []

  const seed = hashString(themeId)
  const count = Math.min(all.length, 10 + (seed % 5))
  const offset = seed % all.length

  return Array.from({ length: count }, (_, i) => all[(offset + i) % all.length])
    .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))
    .map(toNewsItem)
}
