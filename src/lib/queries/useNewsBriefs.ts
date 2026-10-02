import { useApi } from '@/lib/queries/useApi'
import { loadNews } from '@/lib/queries/useNewsDetail'

/** 목록 한 줄에 필요한 만큼의 기사 정보 */
export interface NewsBrief {
  id: string
  title: string
  url: string | null
  publishedAt: string | null
}

const isApiId = (id: string) => /^\d+$/.test(id)

/** 불러오지 못한 기사는 null — 목록에서 그 줄만 빠지고 나머지는 그대로 보인다 */
function loadBrief(id: string): Promise<NewsBrief | null> {
  return loadNews(id).then(
    (raw) => ({
      id,
      title: raw.title ?? '(제목 없음)',
      url: raw.url,
      publishedAt: raw.publishedAt ?? raw.collectedAt,
    }),
    () => null,
  )
}

/**
 * 여러 기사의 제목·발행 시각을 한꺼번에 — 간선의 출처 기사, 이벤트의 구성 기사가 쓴다.
 * 일괄 조회 엔드포인트가 없어 기사마다 한 번씩 부르지만, 뉴스 모달과 같은 캐시(loadNews)를 타므로 한 기사는 한 번만 나간다.
 * ids가 바뀌는 동안에는 이전 결과가 남아 있으므로 소비자는 id로 찾아 쓴다.
 */
export function useNewsBriefs(ids: string[]): { briefs: Map<string, NewsBrief>; loading: boolean } {
  const key = ids.join(',')
  const { data, loading } = useApi<Map<string, NewsBrief>>(async () => {
    const results = await Promise.all(ids.filter(isApiId).map(loadBrief))
    return new Map(results.flatMap((b) => (b ? [[b.id, b] as const] : [])))
  }, [key])
  return { briefs: data ?? EMPTY, loading }
}

const EMPTY = new Map<string, NewsBrief>()
