import { useMemo } from 'react'
import { getNewsGraph, getSimilarNews, type NewsGraph, type NewsDetail } from '@/data/newsDetail'

/**
 * 뉴스 상세 모달의 데이터 진입점 — 지금은 로컬 목업을 동기로 읽는다.
 * 백엔드(/api)가 준비되면 이 훅 내부만 fetch로 교체하면 된다.
 *
 * 반환값은 newsId가 같은 동안 안정적이다. GraphCanvas는 data가 새 객체로 바뀌면
 * 그래프를 처음부터 다시 그리므로 이 메모이제이션이 필요하다.
 */
export function useNewsGraph(newsId: string | null): {
  data: NewsGraph | null
  similar: NewsDetail[]
} {
  return useMemo(
    () => ({
      data: newsId ? getNewsGraph(newsId) : null,
      similar: newsId ? getSimilarNews(newsId) : [],
    }),
    [newsId],
  )
}
