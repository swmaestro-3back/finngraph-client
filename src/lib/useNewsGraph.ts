import { useMemo } from 'react'
import type { Hop } from '@/components/graph/HopSelector'
import type { NewsDetail } from '@/lib/apiTypes'
import { getKgData } from '@/lib/kgApi'
import type { KgNewsGraphRes } from '@/lib/kgApiTypes'
import { toNewsGraphData, type NewsGraphData } from '@/lib/kgMappers'
import { useApi } from '@/lib/queries/useApi'

const NO_SIMILAR: NewsDetail[] = []

export function useNewsGraph(
  newsId: string | null,
  hop: Hop = 1,
): {
  data: NewsGraphData | null
  similar: NewsDetail[]
} {
  const res = useApi<KgNewsGraphRes | null>(
    () =>
      newsId
        ? getKgData<KgNewsGraphRes>(`/v1/news/${encodeURIComponent(newsId)}/graph`, { hop })
        : Promise.resolve(null),
    [newsId, hop],
  )

  const data = useMemo(() => (res.data ? toNewsGraphData(res.data) : null), [res.data])

  return { data, similar: NO_SIMILAR }
}
