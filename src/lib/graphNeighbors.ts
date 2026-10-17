// 선택 노드의 이웃을 관계 타입·방향별로 나눈다 — 상세 패널의 섹션(공급처/납품처/인수/…)이 이 묶음을 그대로 그린다.
// d3나 DOM에 의존하지 않는 순수 계산.

import { endId, type GraphLink, type GraphNode, type Predicate } from '@/data/graphTypes'

/** 이웃 하나 — 노드와 함께 그 이웃으로 이어진 간선을 든다. 패널의 행이 품목·근거 수·최근 언급을 간선에서 읽는다 */
export interface Neighbor {
  node: GraphNode
  link: GraphLink
}

export interface NodeNeighbors {
  /** SUPPLIES_TO 들어옴 — 이 기업에 납품하는 곳 */
  suppliers: Neighbor[]
  /** SUPPLIES_TO 나감 — 이 기업이 납품하는 곳 */
  customers: Neighbor[]
  /** ACQUIRES 나감 — 이 기업이 인수한 곳 */
  acquired: Neighbor[]
  /** ACQUIRES 들어옴 — 이 기업을 인수한 곳 */
  acquirers: Neighbor[]
  /** INVESTS_IN 나감 — 이 기업이 투자한 곳 */
  investees: Neighbor[]
  /** INVESTS_IN 들어옴 — 이 기업에 투자한 곳 */
  investors: Neighbor[]
  /** BELONGS_TO 나감 — 기업이 속한 테마 */
  themes: Neighbor[]
  /** BELONGS_TO 들어옴 — 테마에 속한 기업 */
  members: Neighbor[]
  /** HAS_EVENT 나감 — 기업이 언급된 이벤트 */
  events: Neighbor[]
  /** HAS_EVENT 들어옴 — 이벤트에 언급된 기업 */
  mentioners: Neighbor[]
}

type Bucket = keyof NodeNeighbors

/** 관계 타입별로 [나가는 쪽 버킷, 들어오는 쪽 버킷] */
const BUCKETS: Record<Predicate, [outgoing: Bucket, incoming: Bucket]> = {
  SUPPLIES_TO: ['customers', 'suppliers'],
  ACQUIRES: ['acquired', 'acquirers'],
  INVESTS_IN: ['investees', 'investors'],
  BELONGS_TO: ['themes', 'members'],
  HAS_EVENT: ['events', 'mentioners'],
}

export const EMPTY_NEIGHBORS: NodeNeighbors = {
  suppliers: [],
  customers: [],
  acquired: [],
  acquirers: [],
  investees: [],
  investors: [],
  themes: [],
  members: [],
  events: [],
  mentioners: [],
}

/**
 * nodeId에 닿는 간선을 훑어 이웃을 버킷에 담는다. 같은 이웃이 여러 간선으로 이어져도 한 번만 넣고(먼저 온 간선이 남는다),
 * nodeById에 없는 끝점은 건너뛴다. links는 필터 전 전체 그래프를 넘겨야 캔버스에서 숨긴 테마도 칩으로 보인다.
 */
export function classifyNeighbors(
  nodeId: string,
  links: GraphLink[],
  nodeById: Map<string, GraphNode>,
): NodeNeighbors {
  const seen: Record<Bucket, Map<string, Neighbor>> = {
    suppliers: new Map(),
    customers: new Map(),
    acquired: new Map(),
    acquirers: new Map(),
    investees: new Map(),
    investors: new Map(),
    themes: new Map(),
    members: new Map(),
    events: new Map(),
    mentioners: new Map(),
  }

  links.forEach((l) => {
    const s = endId(l.source)
    const t = endId(l.target)
    // 서버가 아직 모르는 관계 타입을 보내면 버킷이 없다 — 무시하고 넘어간다 (매핑 단계에서도 거르지만 이중 방어)
    const bucket = BUCKETS[l.type]
    if (!bucket) return
    const [outgoing, incoming] = bucket
    if (s === nodeId) {
      const n = nodeById.get(t)
      if (n && !seen[outgoing].has(t)) seen[outgoing].set(t, { node: n, link: l })
    }
    if (t === nodeId) {
      const n = nodeById.get(s)
      if (n && !seen[incoming].has(s)) seen[incoming].set(s, { node: n, link: l })
    }
  })

  const result = { ...EMPTY_NEIGHBORS }
  ;(Object.keys(seen) as Bucket[]).forEach((k) => {
    result[k] = [...seen[k].values()]
  })
  return result
}
