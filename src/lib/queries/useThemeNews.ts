import { getPage } from '@/lib/api'
import { toNewsDetail } from '@/lib/apiMappers'
import type { NewsRes } from '@/lib/apiTypes'
import type { NewsDetail } from '@/lib/apiTypes'
import { AUTO_REFRESH_MS } from '@/lib/autoRefresh'
import { createTtlCache } from '@/lib/queries/ttlCache'
import { useApi, type ApiState } from '@/lib/queries/useApi'

// 뉴스 목록은 분 단위로 바뀌지 않는다 — 대시보드에서 타일을 오갈 때 같은 테마를 다시 받지 않는다
const cached = createTtlCache<NewsDetail[]>(AUTO_REFRESH_MS)

export function useThemeNews(id: number | null): ApiState<NewsDetail[]> {
  return useApi<NewsDetail[]>(
    () =>
      id === null
        ? Promise.resolve([])
        : cached(String(id), () =>
            getPage<NewsRes>(`/v1/themes/${id}/news`, 0, 100).then((page) =>
              page.items.map(toNewsDetail),
            ),
          ),
    [id],
  )
}
