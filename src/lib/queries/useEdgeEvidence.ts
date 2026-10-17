import { AUTO_REFRESH_MS } from '@/lib/autoRefresh'
import { evidencePath } from '@/lib/edgeEvidence'
import { getKgData } from '@/lib/kgApi'
import type { KgRelationshipEvidenceRes } from '@/lib/kgApiTypes'
import { createTtlCache } from '@/lib/queries/ttlCache'
import { useApi, type ApiState } from '@/lib/queries/useApi'

/** 패널에 보이는 최신 기사 수 */
export const EVIDENCE_LIMIT = 12

// 근거 기사는 시세가 아니다 — 간선을 다시 눌러도 같은 응답을 쓴다. 서버도 같은 응답에 Cache-Control(10분)을 붙인다
const cached = createTtlCache<KgRelationshipEvidenceRes>(AUTO_REFRESH_MS)

/** 간선 근거(기사 제목·월별 건수·공시)를 kg-api에서 한 번에. enabled가 false면(근거 없는 간선) 부르지 않는다 */
export function useEdgeEvidence(linkId: string, enabled = true): ApiState<KgRelationshipEvidenceRes | null> {
  return useApi<KgRelationshipEvidenceRes | null>(
    () =>
      enabled
        ? cached(linkId, () =>
            getKgData<KgRelationshipEvidenceRes>(evidencePath(linkId), { limit: EVIDENCE_LIMIT }),
          )
        : Promise.resolve(null),
    [linkId, enabled],
  )
}
