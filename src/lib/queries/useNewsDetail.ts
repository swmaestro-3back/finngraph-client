import { ApiError, getData } from '@/lib/api'
import { toNewsDetail } from '@/lib/apiMappers'
import type { NewsDetail, NewsRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

/**
 * 기사 id → 상세 응답. 기사 본문은 바뀌지 않으므로 탭이 살아 있는 동안 쥐고 있는다 —
 * 그래프 패널이 제목을 불러온 기사를 모달이 다시 부르지 않고, 같은 기사를 다시 열어도 호출이 없다.
 * 없는 기사(404)는 실패한 채로 남기고, 일시적인 실패는 지워서 다음에 다시 시도한다.
 */
const cache = new Map<string, Promise<NewsRes>>()

/** 메인 백엔드 기사 id는 숫자 문자열 — kg-api의 element_id처럼 다른 모양이면 호출하지 않는다 */
export const isApiId = (id: string): boolean => /^\d+$/.test(id)

export function loadNews(newsId: string): Promise<NewsRes> {
  const hit = cache.get(newsId)
  if (hit) return hit
  const request = getData<NewsRes>(`/v1/news/${newsId}`).catch((e: unknown) => {
    if (!(e instanceof ApiError && e.isNotFound)) cache.delete(newsId)
    throw e
  })
  cache.set(newsId, request)
  return request
}

export function useNewsDetail(newsId: string | null): ApiState<NewsDetail> {
  return useApi<NewsDetail>(
    () => {
      if (newsId === null) return Promise.resolve(null as unknown as NewsDetail)
      return loadNews(newsId).then(toNewsDetail)
    },
    [newsId],
  )
}
