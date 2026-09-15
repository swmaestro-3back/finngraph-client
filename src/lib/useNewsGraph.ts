import type { Hop } from '@/components/graph/HopSelector'
import type { EntityType, GraphData, GraphLink, GraphNode } from '@/data/graphTypes'
import type { NewsDetail } from '@/lib/apiTypes'

export interface NewsRelation {
  link: GraphLink
  source: GraphNode
  target: GraphNode
}

export interface NewsEntity {
  label: string
  type: EntityType
  nodeId?: string
}

/** 관계 목록에서 등장 엔티티를 라벨 기준으로 중복 없이 뽑는다 (양끝 노드 우선, 링크 item은 뒤에) */
export function newsEntities(relations: NewsRelation[]): NewsEntity[] {
  const byLabel = new Map<string, NewsEntity>()
  const add = (entity: NewsEntity) => {
    if (!byLabel.has(entity.label)) byLabel.set(entity.label, entity)
  }

  relations.forEach(({ source, target }) => {
    add({ label: source.label, type: source.type, nodeId: source.id })
    add({ label: target.label, type: target.type, nodeId: target.id })
  })
  relations.forEach(({ link }) => {
    if (link.item) add({ label: link.item.text, type: link.item.type })
  })
  return [...byLabel.values()]
}

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
