import { getPage } from '@/lib/api'
import { toNewsDetail } from '@/lib/apiMappers'
import type { NewsDetail, NewsRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

/** 관심종목 뉴스 피드 — enabled가 false면 호출 자체를 건너뛴다(비로그인·탭 미선택) */
export function useFavoriteNews(enabled: boolean): ApiState<NewsDetail[]> {
  return useApi<NewsDetail[]>(
    () =>
      enabled
        ? getPage<NewsRes>('/v1/me/favorites/news', 0, 50).then((page) =>
            page.items.map(toNewsDetail),
          )
        : Promise.resolve([]),
    [enabled],
  )
}
