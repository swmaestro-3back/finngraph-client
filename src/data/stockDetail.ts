
import type { CandleDate } from '@/data/candles'
import { toNewsItem, type NewsItem } from '@/data/news'
import { listNews, type NewsDetail } from '@/data/newsDetail'
import { getMarketCap, hashString } from '@/data/stockMeta'
import { THEME_NEWS_KINDS } from '@/data/themeNews'
import { formatAmount } from '@/lib/format'

export interface StockInfo {
  name: string
  code: string
  price: number
  change: number
  themeId: string
  themeName: string
}

export const DEFAULT_STOCK: StockInfo = {
  name: 'SK하이닉스',
  code: '000660',
  price: 9150,
  change: 1.67,
  themeId: '반도체',
  themeName: '반도체',
}

export interface StatTile {
  label: string
  value: string
}

const EPS_2026E = 22080
const DPS_2026E = 1763

export function getStatTiles(stock: StockInfo, foreignRatio: number): StatTile[] {
  const per = stock.price / EPS_2026E
  const dividendYield = (DPS_2026E / stock.price) * 100

  return [
    { label: '시가총액', value: `${formatAmount(getMarketCap(stock.code, stock.price))}억` },
    { label: 'PER', value: `${per.toFixed(2)}배` },
    { label: 'PBR', value: '2.35' },
    { label: 'ROE', value: '30.15%' },
    { label: 'EPS', value: `${EPS_2026E.toLocaleString('ko-KR')}원` },
    { label: '배당수익률', value: `${dividendYield.toFixed(2)}%` },
    { label: '외국인 보유율', value: `${foreignRatio.toFixed(1)}%` },
    { label: '전년 대비 매출', value: '+50.8%' },
  ]
}

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

function tradingDayLabel(index: number, count: number): string {
  const base = new Date(2026, 6, 31)
  const d = new Date(base)
  d.setDate(base.getDate() - (count - 1 - index))
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export interface SupplyPoint {
  label: string
  foreignRatio: number
  foreignNet: number
  institutionNet: number
  pensionNet: number
}

export function generateSupplyDemand(code: string): SupplyPoint[] {
  const rand = mulberry32(hashString(`supply-${code}`))
  const count = 40
  let ratio = 51.5
  const points: SupplyPoint[] = []
  for (let i = 0; i < count; i++) {
    ratio += (rand() - 0.42) * 0.35
    points.push({
      label: tradingDayLabel(i, count),
      foreignRatio: Math.round(ratio * 100) / 100,
      foreignNet: Math.round((rand() - 0.42) * 180),
      institutionNet: Math.round((rand() - 0.5) * 120),
      pensionNet: Math.round((rand() - 0.48) * 60),
    })
  }
  return points
}


export type IssueKind = '호재' | '악재'

export interface IssueNews extends NewsItem {
  kind: IssueKind
}

export interface IssueDay {
  label: string
  date: string
  good: number
  bad: number
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
      items: [...goodItems, ...badItems],
    }
  })
}
