import type { CandleDate } from '@/data/candles'
import { generateIssueTimeline, type IssueDay } from '@/data/stockDetail'
import { hashString } from '@/data/stockMeta'
import { getThemeNewsPool } from '@/data/themeNews'
import type { ThemeItem } from '@/data/themes'


export interface ReactedStock {
  name: string
  code: string
  change: number
}

export interface ThemeIssueDay extends IssueDay {
  reacted: ReactedStock[]
}

export function generateThemeIssueTimeline(
  theme: ThemeItem,
  dates: CandleDate[],
): ThemeIssueDay[] {
  const base = generateIssueTimeline(`theme-${theme.id}`, dates, getThemeNewsPool(theme.id) ?? undefined)
  const stocks = theme.stocks

  return base.map((day) => {
    const total = day.good + day.bad
    if (total === 0 || stocks.length === 0) return { ...day, reacted: [] }

    const count = Math.min(stocks.length, Math.min(5, 1 + total))
    const start = hashString(`${theme.id}-${day.date}-reacted`) % stocks.length

    const reacted: ReactedStock[] = Array.from({ length: count }, (_, i) => {
      const stock = stocks[(start + i) % stocks.length]
      const h = hashString(`${theme.id}-${day.date}-${stock.code}`)
      const magnitude = 0.4 + (h % 57) / 10
      const positive = (h >> 3) % total < day.good
      return {
        name: stock.name,
        code: stock.code,
        change: Math.round((positive ? magnitude : -magnitude) * 100) / 100,
      }
    })

    reacted.sort((a, b) => b.change - a.change)
    return { ...day, reacted }
  })
}
