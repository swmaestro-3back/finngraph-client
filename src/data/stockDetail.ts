
import type { CandleDate } from '@/data/candles'
import { toNewsItem, type NewsItem } from '@/data/news'
import { listNews, type NewsDetail } from '@/data/newsDetail'
import { hashString } from '@/data/stockMeta'
import { THEME_NEWS_KINDS } from '@/data/themeNews'

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface SupplyPoint {
  label: string
  foreignRatio: number | null
  foreignNet: number | null
  institutionNet: number | null
  individualNet: number | null
}

export type IssueKind = '호재' | '악재' | '중립'

export interface IssueNews extends NewsItem {
  kind: IssueKind
}

export interface IssueDay {
  label: string
  date: string
  good: number
  bad: number
  neutral: number
  items: IssueNews[]
}

function issueKind(newsId: string): IssueKind {
  return THEME_NEWS_KINDS[newsId] ?? (hashString(`sentiment-${newsId}`) % 5 < 3 ? '호재' : '악재')
}

export function generateIssueTimeline(
  code: string,
  dates: CandleDate[],
  pool?: NewsDetail[],
): IssueDay[] {
  const all = pool ?? listNews()
  const rand = mulberry32(hashString(`issue-${code}`))
  let cursor = hashString(code) % Math.max(all.length, 1)

  return dates.map(({ label, date }) => {
    const total = all.length === 0 ? 0 : Math.floor(rand() * 6)
    const goodItems: IssueNews[] = []
    const badItems: IssueNews[] = []
    for (let j = 0; j < total; j++) {
      const news = all[cursor % all.length]
      cursor++
      const item = { ...toNewsItem(news), kind: issueKind(news.id) }
      ;(item.kind === '호재' ? goodItems : badItems).push(item)
    }
    return {
      label,
      date,
      good: goodItems.length,
      bad: badItems.length,
      neutral: 0,
      items: [...goodItems, ...badItems],
    }
  })
}
