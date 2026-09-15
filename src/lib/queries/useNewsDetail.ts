import { getData } from '@/lib/api'
import { toNewsDetail } from '@/lib/apiMappers'
import type { NewsDetail, NewsRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useNewsDetail(newsId: string | null): ApiState<NewsDetail> {
  return useApi<NewsDetail>(
    () => {
      if (newsId === null) return Promise.resolve(null as unknown as NewsDetail)
      return getData<NewsRes>(`/v1/news/${newsId}`).then(toNewsDetail)
    },
    [newsId],
  )
}
