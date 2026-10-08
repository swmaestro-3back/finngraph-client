import { getKgData } from '@/lib/kgApi'
import type { KgEventDetailRes } from '@/lib/kgApiTypes'
import { createTtlCache } from '@/lib/queries/ttlCache'
import { useApi, type ApiState } from '@/lib/queries/useApi'

const EVENT_ARTICLE_LIMIT = 12

// 관련 기업 시세가 실려 오므로 종목 목록 캐시와 같은 주기로만 쥔다
const cached = createTtlCache<KgEventDetailRes>(5 * 60 * 1000)

/** 이벤트(뉴스 클러스터)의 키워드·기사·관련 기업을 kg-api에서 한 번에. cluster_id가 없으면 부르지 않는다 */
export function useEventDetail(clusterId: number | undefined): ApiState<KgEventDetailRes | null> {
  return useApi<KgEventDetailRes | null>(
    () =>
      clusterId == null
        ? Promise.resolve(null)
        : cached(String(clusterId), () =>
            getKgData<KgEventDetailRes>(`/v1/events/${clusterId}`, { limit: EVENT_ARTICLE_LIMIT }),
          ),
    [clusterId],
  )
}
