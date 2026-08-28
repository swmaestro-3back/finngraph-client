import type { NewsItem } from '@/data/news'
import { pressOf, type NewsDetail } from '@/data/newsDetail'
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
