import { useMemo } from 'react'
import type { Hop } from '@/components/graph/HopSelector'
import { getNewsGraph, getSimilarNews, type NewsGraph } from '@/data/graphNews'
import type { NewsDetail } from '@/lib/apiTypes'

/**
 * 뉴스 상세 모달의 데이터 진입점 — 지금은 로컬 목업을 동기로 읽는다.
 * 백엔드(/api)가 준비되면 이 훅 내부만 fetch로 교체하면 된다.
 *
 * hop은 기사를 원점으로 센 거리다 — 1홉이 기사에 나온 엔티티고, 2홉부터가 확장이다.
 * getNewsGraph는 그 엔티티에서 몇 단계 더 넓힐지를 받으므로 여기서 hop - 1로 옮긴다.
 *
 * 반환값은 newsId와 hop이 같은 동안 안정적이다. GraphCanvas는 data가 새 객체로
 * 바뀌면 그래프를 처음부터 다시 그리므로 이 메모이제이션이 필요하다.
 */
export function useNewsGraph(
  newsId: string | null,
  hop: Hop = 1,
): {
  data: NewsGraph | null
  similar: NewsDetail[]
} {
  // 유사 뉴스는 홉과 무관하다 — 함께 묶으면 홉을 누를 때마다 전체 뉴스를 다시 훑는다
  const data = useMemo(() => (newsId ? getNewsGraph(newsId, hop - 1) : null), [newsId, hop])
  const similar = useMemo(() => (newsId ? getSimilarNews(newsId) : []), [newsId])

  return { data, similar }
}
