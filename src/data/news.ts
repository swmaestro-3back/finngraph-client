// 테마별 관련 뉴스 — 목업 뉴스 테이블(newsDetail)에서 테마마다 결정적으로 골라 내려준다.
// id가 뉴스 테이블의 키(news-001…)라 그대로 뉴스 상세 모달로 이어진다.

import { listNews, pressOf, type NewsDetail } from '@/data/newsDetail'
import { hashString } from '@/data/stockMeta'
import { formatRelativeTime } from '@/lib/format'

export interface NewsItem {
  id: string
  title: string
  meta: string
}

/** 뉴스 테이블 한 행 → 리스트 한 줄 */
export function toNewsItem(news: NewsDetail): NewsItem {
  return {
    id: news.id,
    title: news.title,
    meta: `${pressOf(news.url)} · ${formatRelativeTime(news.collectedAt)}`,
  }
}

/**
 * 테마에 붙일 뉴스 — 전체 뉴스에서 테마 해시로 시작 위치를 잡아 10~14건을 고른다.
 * 같은 테마는 항상 같은 목록을 받는다.
 */
export function getThemeNews(themeId: string): NewsItem[] {
  const all = listNews()
  if (all.length === 0) return []

  const seed = hashString(themeId)
  const count = Math.min(all.length, 10 + (seed % 5))
  const offset = seed % all.length

  return Array.from({ length: count }, (_, i) => all[(offset + i) % all.length])
    .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))
    .map(toNewsItem)
}
