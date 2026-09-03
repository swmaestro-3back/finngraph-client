// 그래프 캔버스의 순수 계산 — d3 셀렉션이나 DOM에 의존하지 않아 단독으로 검증 가능하다.

import { endId, type EntityType, type GraphLink, type GraphNode } from '@/data/graphTypes'

/**
 * 노드 반지름 범위.
 * 최소값은 짧은 라벨(3~4자)이 읽히는 크기, 최대값은 31개 노드가 캔버스에 들어가는 크기.
 */
export const NODE_RADIUS = { min: 20, max: 52 } as const

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

  // 차수가 모두 같으면 상대 비교가 의미 없으므로 중간 크기로 통일
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

/** 반지름에 맞춘 라벨 폰트 크기 */
export function nodeFontSize(radius: number): number {
  return Math.max(8.5, Math.min(16, radius * 0.42))
}

/**
 * 원 안쪽에서 라벨이 쓸 수 있는 가로 폭.
 * 라벨은 세로 중앙에 놓이므로 그 높이에서의 현(弦)은 지름과 거의 같다 — 좌우 여백만 남긴다.
 */
export function labelMaxWidth(radius: number): number {
  return radius * 2 * 0.88
}

/** 언급량 → 간선 굵기 */
export function edgeWidth(link: GraphLink): number {
  return Math.max(0.8, Math.min(0.8 + link.mentioned_count * 0.13, 3.5))
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

const SECTOR_ORDER: EntityType[] = ['company', 'theme']
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

/**
 * 초기 좌표를 종류별 섹터 안에 황금각(sunflower)으로 흩뿌린다.
 *
 * 좌표가 겹치면 반발력이 발산해 그래프가 화면 밖으로 터지므로,
 * 결정적이면서 서로 겹치지 않는 배치가 필요하다.
 */
export function seedPositions(nodes: GraphNode[], width: number, height: number): void {
  const ringRadius = Math.min(width, height) * 0.42
  const sectorCenter = new Map<EntityType, { x: number; y: number }>()
  SECTOR_ORDER.forEach((type, i) => {
    const angle = (2 * Math.PI * i) / SECTOR_ORDER.length - Math.PI / 2
    sectorCenter.set(type, {
      x: width / 2 + ringRadius * Math.cos(angle),
      y: height / 2 + ringRadius * Math.sin(angle),
    })
  })

  const seatsPerType = new Map<EntityType, number>()
  const fallbackCenter = { x: width / 2, y: height / 2 }
  nodes.forEach((n) => {
    // 섹터에 없는 타입이 새로 생겨도 캔버스가 죽지 않도록 중앙으로 보낸다
    const center = sectorCenter.get(n.type) ?? fallbackCenter
    const seat = seatsPerType.get(n.type) ?? 0
    seatsPerType.set(n.type, seat + 1)
    const r = 30 * Math.sqrt(seat + 0.5)
    const a = seat * GOLDEN_ANGLE
    n.x = center.x + r * Math.cos(a)
    n.y = center.y + r * Math.sin(a)
  })
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
