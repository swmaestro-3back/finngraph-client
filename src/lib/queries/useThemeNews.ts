import { getPage } from '@/lib/api'
import { toNewsDetail } from '@/lib/apiMappers'
import type { NewsRes } from '@/lib/apiTypes'
import type { NewsDetail } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useThemeNews(name: string | null): ApiState<NewsDetail[]> {
  return useApi<NewsDetail[]>(
    () =>
      name === null
        ? Promise.resolve([])
        : getPage<NewsRes>(`/v1/themes/${encodeURIComponent(name)}/news`, 0, 100).then(
            (page) => page.items.map(toNewsDetail),
          ),
    [name],
  )
}
