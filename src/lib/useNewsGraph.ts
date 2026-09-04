import type { Hop } from '@/components/graph/HopSelector'
import type { NewsRelation } from '@/data/graphNews'
import type { GraphData } from '@/data/graphTypes'
import type { NewsDetail } from '@/lib/apiTypes'

export interface NewsGraphData {
  graph: GraphData
  relations: NewsRelation[]
  expanded: NewsRelation[]
  seedIds: string[]
}

const NO_SIMILAR: NewsDetail[] = []

/**
 * 기사 기반 서브그래프.
 *
 * kg-api가 공급망·테마 두 엔드포인트만 남기면서 `/news/{id}/graph`가 사라져(2026-09),
 * 지금은 호출하지 않고 항상 빈 결과를 돌려준다. 모달의 "기사 속 관계" 섹션은 data가 null이면
 * 렌더되지 않으므로 컴포넌트는 그대로 두고, 서버가 복구되면 여기서만 다시 잇는다.
 */
export function useNewsGraph(
  _newsId: string | null,
  _hop: Hop = 1,
): {
  data: NewsGraphData | null
  similar: NewsDetail[]
} {
  return { data: null, similar: NO_SIMILAR }
}
