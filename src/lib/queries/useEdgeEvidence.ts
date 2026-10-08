import { evidencePath } from '@/lib/edgeEvidence'
import { getKgData } from '@/lib/kgApi'
import type { KgRelationshipEvidenceRes } from '@/lib/kgApiTypes'
import { createTtlCache } from '@/lib/queries/ttlCache'
import { useApi, type ApiState } from '@/lib/queries/useApi'

/** 패널에 보이는 최신 기사 수 */
export const EVIDENCE_LIMIT = 12

// 근거 기사는 시세가 아니다 — 간선을 다시 눌러도 같은 응답을 쓴다
const cached = createTtlCache<KgRelationshipEvidenceRes>(5 * 60 * 1000)

/** 간선 근거(기사 제목·월별 건수·공시)를 kg-api에서 한 번에 */
export function useEdgeEvidence(linkId: string): ApiState<KgRelationshipEvidenceRes> {
  return useApi<KgRelationshipEvidenceRes>(
    () =>
      cached(linkId, () =>
        getKgData<KgRelationshipEvidenceRes>(evidencePath(linkId), { limit: EVIDENCE_LIMIT }),
      ),
    [linkId],
  )
}
