// 그래프 탐색 — 홉 거리 계산.
// d3나 DOM에 의존하지 않는 순수 계산이다.

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
