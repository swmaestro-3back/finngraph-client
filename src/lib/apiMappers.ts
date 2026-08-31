import { formatRelativeTime, pressOf } from '@/lib/format'
import {
  CANDLE_COUNTS,
  type AnnualFinancials,
  type AnnualFinancialsRes,
  type Candle,
  type CandleDate,
  type CandlePeriod,
  type CandleRes,
  type InvestorFlowRes,
  type IssueDay,
  type IssueNews,
  type NewsDetail,
  type NewsItem,
  type NewsRes,
  type SupplyPoint,
} from '@/lib/apiTypes'

function calendarDate(index: number, count: number, period: CandlePeriod): CandleDate {
  const base = new Date(2026, 6, 31)
  const stepDays = period === 'D' ? 1 : period === 'W' ? 7 : 30
  const d = new Date(base)
  d.setDate(base.getDate() - (count - 1 - index) * stepDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return {
    label: period === 'M' ? `${y}.${m}` : `${d.getMonth() + 1}/${d.getDate()}`,
    date: `${y}.${m}.${String(d.getDate()).padStart(2, '0')}`,
  }
}

export function candleDates(period: CandlePeriod): CandleDate[] {
  const count = CANDLE_COUNTS[period]
  return Array.from({ length: count }, (_, i) => calendarDate(i, count, period))
}

export function toNewsDetail(raw: NewsRes): NewsDetail {
  return {
    id: String(raw.id),
    title: raw.title ?? '(제목 없음)',
    summary: raw.summary ?? '',
    url: raw.url ?? '',
    collectedAt: raw.publishedAt ?? raw.collectedAt ?? '',
  }
}

export function toNewsItem(news: NewsDetail): NewsItem {
  return {
    id: news.id,
    title: news.title,
    meta: `${pressOf(news.url)} · ${formatRelativeTime(news.collectedAt)}`,
  }
}

const PERIOD_STEP_DAYS: Record<CandlePeriod, number> = { D: 1, W: 7, M: 30 }

function slotEnd(date: string): number {
  const [y, m, d] = date.split('.').map(Number)
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime()
}

export function buildIssueTimeline(
  news: NewsDetail[],
  dates: CandleDate[],
  period: CandlePeriod,
): IssueDay[] {
  const stepMs = PERIOD_STEP_DAYS[period] * 24 * 60 * 60 * 1000
  const ends = dates.map((d) => slotEnd(d.date))
  const buckets: IssueNews[][] = dates.map(() => [])

  for (const item of news) {
    if (!item.collectedAt) continue
    const t = new Date(item.collectedAt).getTime()
    if (Number.isNaN(t)) continue
    const index = ends.findIndex((end) => t <= end && t > end - stepMs)
    if (index === -1) continue
    buckets[index].push({ ...toNewsItem(item), kind: '중립' })
  }

  return dates.map((d, i) => ({
    label: d.label,
    date: d.date,
    good: 0,
    bad: 0,
    neutral: buckets[i].length,
    items: buckets[i],
  }))
}

export function toCandleView(res: CandleRes, period: CandlePeriod): Candle {
  const [y, m, d] = res.date.split('-').map(Number)
  return {
    open: res.open,
    high: res.high,
    low: res.low,
    close: res.close,
    volume: res.volume,
    label: period === 'M' ? `${y}.${String(m).padStart(2, '0')}` : `${m}/${d}`,
  }
}

export function toCandleDates(candles: CandleRes[], period: CandlePeriod): CandleDate[] {
  return candles.map((c) => {
    const [y, m, d] = c.date.split('-').map(Number)
    return {
      label: period === 'M' ? `${y}.${String(m).padStart(2, '0')}` : `${m}/${d}`,
      date: `${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}`,
    }
  })
}

export function toSupplyPoint(res: InvestorFlowRes): SupplyPoint {
  const [, m, d] = res.date.split('-').map(Number)
  return {
    label: `${m}/${d}`,
    foreignRatio: res.foreignRatio,
    foreignNet: res.foreignNet === null ? null : Math.round(res.foreignNet / 1e4),
    institutionNet: res.institutionNet === null ? null : Math.round(res.institutionNet / 1e4),
    individualNet: res.individualNet === null ? null : Math.round(res.individualNet / 1e4),
  }
}

const TRILLION = 1e12

function toTrillion(won: number | null): number | null {
  return won === null ? null : Math.round((won / TRILLION) * 100) / 100
}

export function toAnnualFinancials(res: AnnualFinancialsRes): AnnualFinancials {
  return {
    year: res.year,
    revenue: toTrillion(res.revenue),
    operatingProfit: toTrillion(res.operatingProfit),
    netIncome: toTrillion(res.netIncome),
    operatingMargin: res.operatingMargin,
    roe: res.roe,
    debtRatio: res.debtRatio,
    totalAssets: toTrillion(res.totalAssets),
    separateAssets: toTrillion(res.separateAssets),
    totalEquity: toTrillion(res.totalEquity),
    totalDebt: toTrillion(res.totalDebt),
    eps: res.eps,
    per: res.per,
    pbr: res.pbr,
    dps: res.dps,
    payoutRatio: res.payoutRatio,
  }
}
