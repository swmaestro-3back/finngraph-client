// 그래프 탐색 — 홉 거리 계산과 그에 따른 서브그래프 확장.
// d3나 DOM에 의존하지 않는 순수 계산이라 캔버스와 데이터 레이어가 함께 쓴다.

import { endId, type GraphData, type GraphLink } from '@/data/graphTypes'
import { buildAdjacency } from '@/lib/graphLayout'

/**
 * 시작 노드들에서 maxHops 이내로 닿는 노드의 홉 수를 잰다 (시작 노드는 0).
 * 닿지 않는 노드는 아예 담지 않아, 결과에 없으면 "범위 밖"이다.
 */
export function bfsDistances(
  startIds: string[],
  adjacency: Map<string, Set<string>>,
  maxHops: number,
): Map<string, number> {
  const distance = new Map<string, number>()
  startIds.forEach((id) => distance.set(id, 0))

  let frontier = startIds
  for (let hop = 1; hop <= maxHops && frontier.length > 0; hop++) {
    const next: string[] = []
    frontier.forEach((id) => {
      adjacency.get(id)?.forEach((neighbor) => {
        if (distance.has(neighbor)) return
        distance.set(neighbor, hop)
        next.push(neighbor)
      })
    })
    frontier = next
  }
  return distance
}

/** 같은 관계인지 판별하는 키 — 전체 그래프의 병합 링크와 기사 원본 링크를 맞대볼 때 쓴다 */
function tripleKey(link: GraphLink): string {
  return `${endId(link.source)}|${link.type}|${endId(link.target)}`
}

/**
 * seed를 시작점으로 base 그래프를 hops단계까지 넓힌 서브그래프.
 *
 * hops가 0이면 seed를 **그대로(같은 참조로)** 돌려준다 — 캔버스가 참조 동일성으로
 * 재렌더를 판단하므로, 확장하지 않을 때는 새 객체를 만들면 안 된다.
 *
 * 관계는 seed의 링크를 그대로 살리고, base에서는 같은 삼중항이 아닌 것만 가져온다.
 * seed 링크(기사 원본)와 base 링크(기사별로 합쳐진 대표)는 id가 달라, 둘 다 넣으면
 * 같은 관계가 두 번 그려질 뿐 아니라 목록↔캔버스의 id 연동도 끊긴다.
 */
export function expandGraph(base: GraphData, seed: GraphData, hops: number): GraphData {
  if (hops <= 0) return seed

  const seedIds = seed.nodes.map((n) => n.id)
  const reachable = bfsDistances(seedIds, buildAdjacency(base.links), hops)

  const seedTriples = new Set(seed.links.map(tripleKey))
  const links = [
    ...seed.links,
    ...base.links.filter(
      (l) =>
        reachable.has(endId(l.source)) &&
        reachable.has(endId(l.target)) &&
        !seedTriples.has(tripleKey(l)),
    ),
  ]
  const nodes = base.nodes.filter((n) => reachable.has(n.id))

  return {
    nodes,
    links,
    metadata: {
      ...seed.metadata,
      stats: { total_nodes: nodes.length, total_edges: links.length },
    },
  }
}
