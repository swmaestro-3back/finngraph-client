import { ApiError, getData } from '@/lib/api'
import type { NewsRes } from '@/lib/apiTypes'
import { useApi } from '@/lib/queries/useApi'

/** 목록 한 줄에 필요한 만큼의 기사 정보 */
export interface NewsBrief {
  id: string
  title: string
  url: string | null
  publishedAt: string | null
}

const isApiId = (id: string) => /^\d+$/.test(id)

/**
 * 기사 id → 조회 결과. 일괄 조회 엔드포인트가 없어 기사마다 한 번씩 부르므로, 같은 기사를 두 번 부르지 않게 탭이 살아 있는 동안 쥐고 있는다.
 * 없는 기사(404)는 null로 남기고, 일시적인 실패는 지워서 다음 선택 때 다시 시도한다.
 */
const cache = new Map<string, Promise<NewsBrief | null>>()

function fetchBrief(id: string): Promise<NewsBrief | null> {
  const hit = cache.get(id)
  if (hit) return hit
  const request = getData<NewsRes>(`/v1/news/${id}`).then(
    (raw): NewsBrief => ({
      id,
      title: raw.title ?? '(제목 없음)',
      url: raw.url,
      publishedAt: raw.publishedAt ?? raw.collectedAt,
    }),
    (e: unknown) => {
      if (!(e instanceof ApiError && e.isNotFound)) cache.delete(id)
      return null
    },
  )
  cache.set(id, request)
  return request
}

/**
 * 여러 기사의 제목·발행 시각을 한꺼번에 — 간선의 근거 기사, 이벤트의 구성 기사가 쓴다.
 * 불러오지 못한 기사는 결과에서 빠진다. ids가 바뀌는 동안에는 이전 결과가 남아 있으므로 소비자는 id로 찾아 쓴다.
 */
export function useNewsBriefs(ids: string[]): { briefs: Map<string, NewsBrief>; loading: boolean } {
  const key = ids.join(',')
  const { data, loading } = useApi<Map<string, NewsBrief>>(async () => {
    const results = await Promise.all(ids.filter(isApiId).map(fetchBrief))
    return new Map(results.flatMap((b) => (b ? [[b.id, b] as const] : [])))
  }, [key])
  return { briefs: data ?? EMPTY, loading }
}

const EMPTY = new Map<string, NewsBrief>()
