import { getPage } from '@/lib/api'
import { toNewsDetail } from '@/lib/apiMappers'
import type { NewsRes } from '@/lib/apiTypes'
import type { NewsDetail } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useThemeNews(id: number | null): ApiState<NewsDetail[]> {
  return useApi<NewsDetail[]>(
    () =>
      id === null
        ? Promise.resolve([])
        : getPage<NewsRes>(`/v1/themes/${id}/news`, 0, 100).then((page) =>
            page.items.map(toNewsDetail),
          ),
    [id],
  )
}
