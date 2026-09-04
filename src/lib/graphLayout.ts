// 그래프 캔버스의 순수 계산 — d3 셀렉션이나 DOM에 의존하지 않아 단독으로 검증 가능하다.

import { endId, type GraphLink, type GraphNode } from '@/data/graphTypes'

/**
 * 일반 노드 반지름 범위. 라벨을 원 밖에 두므로 점은 작게 — 차수 차이는 면적으로만 읽힌다.
 */
export const NODE_RADIUS = { min: 5, max: 14 } as const

/** 중심 노드 반지름 — 차수 스케일과 무관하게 항상 가장 크다 (화면의 유일한 초점) */
export const CENTER_RADIUS = 22

/**
 * 연결 차수 → 반지름 스케일.
 *
 * 지금 화면에 있는 노드들의 차수 min~max를 기준으로 정규화하므로
 * 필터로 노드가 바뀌면 크기도 그 집합 안에서 다시 상대화된다.
 * 원의 **면적**이 차수에 비례하도록 sqrt를 쓴다(반지름 선형은 큰 노드를 과장한다).
 */
export function createRadiusScale(
  nodes: GraphNode[],
  degree: Map<string, number>,
): (node: GraphNode) => number {
  const degrees = nodes.map((n) => degree.get(n.id) ?? 0)
  const lo = degrees.length ? Math.min(...degrees) : 0
  const hi = degrees.length ? Math.max(...degrees) : 0

  // 차수가 모두 같으면 상대 비교가 의미 없으므로 작은 쪽으로 통일
  if (hi === lo) {
    const uniform = (NODE_RADIUS.min + NODE_RADIUS.max) / 2
    return () => uniform
  }

  const loRoot = Math.sqrt(lo)
  const span = Math.sqrt(hi) - loRoot
  return (node) => {
    const d = degree.get(node.id) ?? 0
    const t = (Math.sqrt(d) - loRoot) / span
    return NODE_RADIUS.min + (NODE_RADIUS.max - NODE_RADIUS.min) * t
  }
}

/** 근거량 → 간선의 출발(공급자) 쪽 폭. 도착 쪽은 항상 가늘어 방향이 읽힌다 */
export function edgeWidth(link: GraphLink): number {
  return Math.max(1.4, Math.min(1.4 + link.mentioned_count * 0.18, 4.5))
}

/** 근거량 → 간선 불투명도. 굵기만으로는 차이가 작아 진하기로도 거든다 */
export function edgeOpacity(link: GraphLink): number {
  return 0.28 + 0.42 * Math.min(1, link.mentioned_count / 12)
}

/** 노드별 연결 차수 */
export function buildDegreeMap(links: GraphLink[]): Map<string, number> {
  const degree = new Map<string, number>()
  links.forEach((l) => {
    const s = endId(l.source)
    const t = endId(l.target)
    degree.set(s, (degree.get(s) ?? 0) + 1)
    degree.set(t, (degree.get(t) ?? 0) + 1)
  })
  return degree
}

/** 노드별 이웃 집합 */
export function buildAdjacency(links: GraphLink[]): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>()
  const add = (from: string, to: string) => {
    const set = adjacency.get(from) ?? new Set<string>()
    set.add(to)
    adjacency.set(from, set)
  }
  links.forEach((l) => {
    const s = endId(l.source)
    const t = endId(l.target)
    add(s, t)
    add(t, s)
  })
  return adjacency
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

/** 노드 좌표 스냅샷 — 다시 그릴 때 제자리를 지키게 하는 기억 */
export type Position = { x: number; y: number }

/**
 * 초기 좌표를 캔버스 중심 둘레에 황금각(sunflower)으로 흩뿌린다.
 *
 * 좌표가 겹치면 반발력이 발산해 그래프가 화면 밖으로 터지므로,
 * 결정적이면서 서로 겹치지 않는 배치가 필요하다. 힘이 이 원반을 방사형으로 펼친다.
 */
export function seedPositions(nodes: GraphNode[], width: number, height: number): void {
  nodes.forEach((n, seat) => {
    const r = 34 * Math.sqrt(seat + 0.5)
    const a = seat * GOLDEN_ANGLE
    n.x = width / 2 + r * Math.cos(a)
    n.y = height / 2 + r * Math.sin(a)
  })
}

/** 앵커 둘레의 seat번째 자리 — 바깥 방향을 가운데 두고 좌우로 번갈아 부채꼴로 벌린다 */
function fanSeat(anchor: Position, outward: number, seat: number): Position {
  const step = Math.ceil(seat / 2) * (seat % 2 === 0 ? 1 : -1)
  const angle = outward + step * 0.45
  const r = 80 + 8 * Math.floor(seat / 2)
  return { x: anchor.x + r * Math.cos(angle), y: anchor.y + r * Math.sin(angle) }
}

/**
 * 이전 레이아웃을 이어받아 배치한다 — 홉·범위·필터가 바뀌어 다시 그릴 때 그래프가 뒤섞이지 않도록.
 *
 * 남아 있던 노드는 기억한 자리에서 시작하고, 새 노드는 이미 자리 잡은 이웃 곁(캔버스 바깥쪽)에서
 * 시작해 상위 홉 노드 주변으로 자라난다. 이웃을 따라 연쇄로 붙으므로 2단계 밖 노드도 자리를 얻는다.
 * 어디에도 붙지 못한 노드만 기존 방식으로 흩뿌린다.
 */
export function placeIncrementally(
  nodes: GraphNode[],
  links: GraphLink[],
  remembered: Map<string, Position>,
  width: number,
  height: number,
): void {
  const placed = new Map<string, Position>()
  nodes.forEach((n) => {
    const p = remembered.get(n.id)
    if (!p) return
    n.x = p.x
    n.y = p.y
    placed.set(n.id, p)
  })

  const adjacency = buildAdjacency(links)
  const seats = new Map<string, number>()
  const pending = nodes.filter((n) => !placed.has(n.id))

  let progress = true
  while (pending.length > 0 && progress) {
    progress = false
    for (let i = pending.length - 1; i >= 0; i--) {
      const n = pending[i]
      const anchorId = [...(adjacency.get(n.id) ?? [])].find((id) => placed.has(id))
      if (!anchorId) continue
      const anchor = placed.get(anchorId)!
      const seat = seats.get(anchorId) ?? 0
      seats.set(anchorId, seat + 1)
      const outward = Math.atan2(anchor.y - height / 2, anchor.x - width / 2)
      const p = fanSeat(anchor, outward, seat)
      n.x = p.x
      n.y = p.y
      placed.set(n.id, p)
      pending.splice(i, 1)
      progress = true
    }
  }

  if (pending.length > 0) seedPositions(pending, width, height)
}

export interface FitView {
  /** 노드 전체를 담는 배율 */
  scale: number
  /** 노드 전체의 중심 */
  cx: number
  cy: number
}

/** 노드 전체가 캔버스에 들어오도록 하는 배율과 중심. 좌표가 없으면 null */
export function computeFitView(
  nodes: GraphNode[],
  width: number,
  height: number,
  { padding = 56, min = 0.35, max = 1.2 } = {},
): FitView | null {
  const placed = nodes.filter((n) => Number.isFinite(n.x) && Number.isFinite(n.y))
  if (placed.length === 0) return null

  const xs = placed.map((n) => n.x!)
  const ys = placed.map((n) => n.y!)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = Math.max(maxX - minX, 1)
  const spanY = Math.max(maxY - minY, 1)

  return {
    scale: Math.max(min, Math.min(max, (width - padding * 2) / spanX, (height - padding * 2) / spanY)),
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  }
}

// ---------------------------------------------------------------- 간선 기하

export interface Segment {
  x1: number
  y1: number
  x2: number
  y2: number
}

/** 2차 베지어 곡선 — 양 끝점과 제어점 */
export interface Curve extends Segment {
  cx: number
  cy: number
}

/** 간선을 두 노드의 원 둘레 사이 구간으로 자른다 — 선이 점 안으로 파고들지 않도록 */
export function trimToNodeEdges(
  link: GraphLink,
  radius: (node: GraphNode) => number,
  gap = 2,
): Segment {
  const s = link.source as GraphNode
  const t = link.target as GraphNode
  const dx = t.x! - s.x!
  const dy = t.y! - s.y!
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const from = radius(s) + gap
  const to = radius(t) + gap
  // 두 원이 겹칠 만큼 가까우면 자르지 않는다 (선이 뒤집히는 것을 방지)
  if (from + to >= len) {
    return { x1: s.x!, y1: s.y!, x2: t.x!, y2: t.y! }
  }
  return {
    x1: s.x! + ux * from,
    y1: s.y! + uy * from,
    x2: t.x! - ux * to,
    y2: t.y! - uy * to,
  }
}

/**
 * 살짝 휜 곡선의 제어점 — 중점에서 진행 방향의 왼쪽으로 길이의 12%(최대 40px).
 * 모든 간선이 같은 회전 방향으로 휘어 방사형 그래프가 한 방향으로 흐르는 인상을 준다.
 */
export function edgeCurve(seg: Segment): Curve {
  const dx = seg.x2 - seg.x1
  const dy = seg.y2 - seg.y1
  const len = Math.hypot(dx, dy) || 1
  const bend = Math.min(len * 0.12, 40)
  return {
    ...seg,
    cx: (seg.x1 + seg.x2) / 2 + (-dy / len) * bend,
    cy: (seg.y1 + seg.y2) / 2 + (dx / len) * bend,
  }
}

/** 곡선의 중심선 path — 넓은 투명 stroke를 얹어 클릭 영역으로 쓴다 */
export function curvePath(c: Curve): string {
  return `M${c.x1},${c.y1}Q${c.cx},${c.cy} ${c.x2},${c.y2}`
}

/**
 * 곡선을 따라 폭이 w0(출발)에서 w1(도착)로 줄어드는 닫힌 도형.
 * stroke가 아니라 fill로 그리므로 화살촉 없이도 "어디서 어디로"가 읽힌다.
 */
export function taperedEdgePath(c: Curve, w0: number, w1: number, steps = 12): string {
  const left: string[] = []
  const right: string[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    const x = u * u * c.x1 + 2 * u * t * c.cx + t * t * c.x2
    const y = u * u * c.y1 + 2 * u * t * c.cy + t * t * c.y2
    const tx = 2 * u * (c.cx - c.x1) + 2 * t * (c.x2 - c.cx)
    const ty = 2 * u * (c.cy - c.y1) + 2 * t * (c.y2 - c.cy)
    const tl = Math.hypot(tx, ty) || 1
    const nx = -ty / tl
    const ny = tx / tl
    const h = (w0 * u + w1 * t) / 2
    left.push(`${(x + nx * h).toFixed(1)},${(y + ny * h).toFixed(1)}`)
    right.push(`${(x - nx * h).toFixed(1)},${(y - ny * h).toFixed(1)}`)
  }
  return `M${left.join('L')}L${right.reverse().join('L')}Z`
}
