
import { ApiError, getData } from '@/lib/api'
import { toNewsDetail } from '@/lib/apiMappers'
import type { NewsRes } from '@/lib/apiTypes'
import { getNews, type NewsDetail } from '@/data/newsDetail'
import { useApi, type ApiState } from '@/lib/queries/useApi'

const isApiId = (id: string) => /^\d+$/.test(id)

export function useNewsDetail(newsId: string | null): ApiState<NewsDetail> {
  return useApi<NewsDetail>(
    () => {
      if (newsId === null) return Promise.resolve(null as unknown as NewsDetail)
      if (!isApiId(newsId)) {
        const mock = getNews(newsId)
        return mock
          ? Promise.resolve(mock)
          : Promise.reject(new ApiError('NEWS_NOT_FOUND', 404, `뉴스 없음: ${newsId}`))
      }
      return getData<NewsRes>(`/v1/news/${newsId}`).then(toNewsDetail)
    },
    [newsId],
  )
}
