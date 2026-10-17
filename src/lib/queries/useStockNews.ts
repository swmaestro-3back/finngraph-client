import { getPage } from '@/lib/api'
import { toNewsDetail } from '@/lib/apiMappers'
import type { NewsDetail, NewsRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useStockNews(ticker: string | null): ApiState<NewsDetail[]> {
  return useApi<NewsDetail[]>(
    () =>
      ticker === null
        ? Promise.resolve([])
        : getPage<NewsRes>(`/v1/stocks/${ticker}/news`, 0, 100).then((page) =>
            page.items.map(toNewsDetail),
          ),
    [ticker],
  )
}
