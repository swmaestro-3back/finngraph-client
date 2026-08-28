import type { NewsItem } from '@/data/news'
import type { CandleDate, CandlePeriod } from '@/data/candles'
import { pressOf, type NewsDetail } from '@/data/newsDetail'
import type { IssueDay, IssueNews } from '@/data/stockDetail'
import { formatRelativeTime } from '@/lib/format'
import type { NewsRes } from '@/lib/apiTypes'

export function toNewsDetail(raw: NewsRes): NewsDetail {
  return {
    id: String(raw.id),
    title: raw.title ?? '(제목 없음)',
    summary: raw.summary ?? '',
    url: raw.link ?? '',
    collectedAt: raw.publishedAt ?? '',
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
