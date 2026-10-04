import type { CandleRes } from '@/lib/apiTypes'
import { volumeRatio } from '@/lib/fg/priceChart'
import type { ThemeNewsItem } from '@/lib/fg/themeNews'

export const OVERVIEW_NEWS_PAGE = 5

export interface NewsDay {
  tradeDay: string
  index: number
  items: ThemeNewsItem[]
  change: number | null
  volumeRatio: number | null
}

export function newsDays(items: readonly ThemeNewsItem[], candles: readonly CandleRes[]): NewsDay[] {
  const indexOf = new Map(candles.map((candle, i) => [candle.date, i]))
  const days = new Map<string, NewsDay>()
  for (const item of items) {
    const index = indexOf.get(item.tradeDay)
    if (index === undefined) continue
    const day = days.get(item.tradeDay)
    if (day) {
      day.items.push(item)
      continue
    }
    const prev = candles[index - 1]
    days.set(item.tradeDay, {
      tradeDay: item.tradeDay,
      index,
      items: [item],
      change: prev && prev.close > 0 ? (candles[index].close / prev.close - 1) * 100 : null,
      volumeRatio: volumeRatio(candles, index),
    })
  }
  return [...days.values()].sort((a, b) => b.tradeDay.localeCompare(a.tradeDay))
}

export function newsPage(
  items: readonly ThemeNewsItem[],
  day: string | null,
  limit: number,
): { rows: ThemeNewsItem[]; total: number } {
  const scoped = day === null ? items : items.filter((item) => item.tradeDay === day)
  return { rows: scoped.slice(0, limit), total: scoped.length }
}

export function openNews(items: readonly ThemeNewsItem[], openFrom: string | null): ThemeNewsItem[] {
  return openFrom === null ? [...items] : items.filter((item) => item.day >= openFrom)
}

export function opensInModal(item: Pick<ThemeNewsItem, 'analyzed' | 'url'>): boolean {
  return item.analyzed || !item.url
}
