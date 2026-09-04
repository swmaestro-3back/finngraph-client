import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import * as d3 from 'd3'
import {
  endId,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  nodeCategory,
  nodeColor,
  type GraphNode,
  type GraphLink,
  type GraphData,
  type NodeCategory,
  type Predicate,
  PREDICATE_LABELS,
} from '@/data/graphTypes'
import {
  buildAdjacency,
  buildDegreeMap,
  computeFitView,
  createRadiusScale,
  curvePath,
  edgeCurve,
  edgeOpacity,
  edgeWidth,
  placeIncrementally,
  seedPositions,
  taperedEdgePath,
  trimToNodeEdges,
  CENTER_RADIUS,
  NODE_RADIUS,
  type Curve,
  type Position,
} from '@/lib/graphLayout'
import { bfsDistances } from '@/lib/graphTraversal'
import { GraphTooltip } from '@/components/graph/GraphTooltip'
import { hideTooltip, moveTooltip, showTooltip } from '@/lib/graphTooltip'
import { useCanvasSize, type CanvasSize } from '@/lib/useCanvasSize'
import { T } from '@/lib/graphTheme'

export interface GraphCanvasRef {
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
}

export type GraphHighlight =
  | { kind: 'nodes'; ids: string[]; hops?: number; camera?: boolean }
  | { kind: 'link'; id: string }

interface Props {
  data: GraphData
  onNodeClick: (node: GraphNode) => void
  /** 노드 더블클릭 — 그 노드를 새 중심으로 다시 조회하는 단축 동작 */
  onNodeDoubleClick?: (node: GraphNode) => void
  onLinkClick: (link: GraphLink) => void
  /** 빈 캔버스 클릭 — 선택 해제 */
  onBackgroundClick: () => void
  highlight: GraphHighlight | null
  /** 지금 조회의 중심 노드 — 유일하게 크게 그리고 글로우를 두른다 */
  centerId?: string | null
  selectedCategories: Set<NodeCategory>
  selectedPredicates: Set<Predicate>
}

/** 하이라이트 한 번을 그리는 데 필요한 모든 것 — 노드/간선 강조가 이 한 형태로 수렴한다 */
interface HighlightSpec {
  /** 강조 대상 노드 */
  focus: Set<string>
  /** 강조 대상의 이웃 (간선 강조 시에는 비어 있다) */
  neighbors: Set<string>
  isLinkOn: (link: GraphLink) => boolean
}

interface D3State {
  nodes: GraphNode[]
  applyHighlight: (highlight: GraphHighlight | null) => void
}

/**
 * 지식그래프 캔버스.
 *
 * 시각 원칙: 대담함은 중심 노드 한 곳에만. 나머지 노드는 작은 점, 라벨은 점 아래 잉크 글자,
 * 간선은 종이 위 연필선처럼 물러난 슬레이트 곡선이다. 색은 호버·선택 때만 켠다.
 */
export const GraphCanvas = forwardRef<GraphCanvasRef, Props>(function GraphCanvas(
  {
    data,
    onNodeClick,
    onNodeDoubleClick,
    onLinkClick,
    onBackgroundClick,
    highlight,
    centerId = null,
    selectedCategories,
    selectedPredicates,
  },
  ref,
) {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink>>(undefined)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>(undefined)
  const d3StateRef = useRef<D3State | null>(null)
  /** 현재 외부 선택 — 호버 종료 시 복원 기준이자 "선택 중인가" 판정 */
  const highlightRef = useRef<GraphHighlight | null>(null)
  /** 선택 시 화면 중앙 고정을 위해 fx/fy를 건 노드 id들 (해제 추적용) */
  const fixedIdsRef = useRef<string[]>([])
  /** 레이아웃 안정화 후 계산한 "전체 보기" 변환 — 초기화 버튼의 기준점 */
  const fitTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity)
  /** 사용자가 직접 확대/이동했는지 — 이후 자동 맞춤이 카메라를 뺏지 않도록 */
  const userMovedRef = useRef(false)
  /**
   * 지금까지 본 노드들의 좌표 — 홉·범위·필터가 바뀌어 다시 그릴 때 남아 있는 노드가 제자리를 지킨다.
   * 사라졌다 돌아온 노드도 예전 자리로 가도록 지우지 않고 쌓는다.
   */
  const positionsRef = useRef(new Map<string, Position>())
  /**
   * 부모 콜백은 ref로 받아 d3 핸들러가 호출 시점의 최신 함수를 부른다.
   * 메인 이펙트 의존성에 넣으면 부모가 콜백을 새로 만들 때마다(예: URL 쿼리 변경) 데이터가 같아도
   * 그래프를 통째로 다시 그려 카메라와 레이아웃이 튄다.
   */
  const handlersRef = useRef({ onNodeClick, onNodeDoubleClick, onLinkClick, onBackgroundClick })
  useEffect(() => {
    handlersRef.current = { onNodeClick, onNodeDoubleClick, onLinkClick, onBackgroundClick }
  })

  // 리사이즈 시에는 이미 배치된 그래프를 새 중심으로 평행이동한다 (약한 forceX/Y로는 못 따라옴)
  const handleResize = useCallback((next: CanvasSize, prev: CanvasSize) => {
    if (svgRef.current) d3.select(svgRef.current).attr('width', next.w).attr('height', next.h)
    const simulation = simulationRef.current
    if (!simulation) return

    const dx = (next.w - prev.w) / 2
    const dy = (next.h - prev.h) / 2
    simulation.nodes().forEach((n) => {
      if (n.x != null) n.x += dx
      if (n.y != null) n.y += dy
      if (n.fx != null) n.fx += dx
      if (n.fy != null) n.fy += dy
    })
    simulation.force('x', d3.forceX(next.w / 2).strength(0.06))
    simulation.force('y', d3.forceY(next.h / 2).strength(0.06))
    simulation.alpha(0.15).restart()
  }, [])

  const { containerRef, sizeRef, sized } = useCanvasSize(handleResize)

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (svgRef.current && zoomRef.current)
        d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.3)
    },
    zoomOut: () => {
      if (svgRef.current && zoomRef.current)
        d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.7)
    },
    resetZoom: () => {
      if (!svgRef.current || !zoomRef.current) return
      userMovedRef.current = false
      d3.select(svgRef.current)
        .transition()
        .duration(500)
        .call(zoomRef.current.transform, fitTransformRef.current)
    },
  }))

  const getFilteredData = useCallback(() => {
    const categoryOf = new Map(data.nodes.map((n) => [n.id, nodeCategory(n)]))
    const links = data.links.filter((l) => {
      if (!selectedPredicates.has(l.type)) return false
      const s = categoryOf.get(endId(l.source))
      const t = categoryOf.get(endId(l.target))
      return !!s && !!t && selectedCategories.has(s) && selectedCategories.has(t)
    })
    const connected = new Set<string>()
    links.forEach((l) => {
      connected.add(endId(l.source))
      connected.add(endId(l.target))
    })
    const nodes = data.nodes.filter(
      (n) => selectedCategories.has(nodeCategory(n)) && connected.has(n.id),
    )
    return { nodes, links }
  }, [data, selectedCategories, selectedPredicates])

  // ========== MAIN EFFECT ==========
  useEffect(() => {
    if (!svgRef.current || !data || !sized) return
    const tooltip = tooltipRef.current

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const { w: width, h: height } = sizeRef.current
    svg.attr('width', width).attr('height', height)

    const filtered = getFilteredData()
    const nodes: GraphNode[] = filtered.nodes.map((d) => ({ ...d }))
    const links: GraphLink[] = filtered.links.map((d) => ({ ...d }))

    const degree = buildDegreeMap(links)
    const adjacency = buildAdjacency(links)
    // 크기는 지금 화면에 있는 노드들 사이의 상대 차수로 결정된다. 중심만 예외로 항상 가장 크다.
    const degreeRadius = createRadiusScale(nodes, degree)
    const radius = (d: GraphNode) => (d.id === centerId ? CENTER_RADIUS : degreeRadius(d))
    const maxRadius = nodes.length ? Math.max(...nodes.map(radius)) : NODE_RADIUS.min
    // 줌아웃 상태에서도 라벨을 남길 노드 — 중심과 허브
    const isHub = (d: GraphNode) => d.id === centerId || (degree.get(d.id) ?? 0) >= HUB_DEGREE

    // 배경 도트 그리드 — 줌·팬을 따라 움직여 공간감을 준다. 클릭은 통과시켜 배경 클릭(선택 해제)이 살아 있다.
    const defs = svg.append('defs')
    const dots = defs
      .append('pattern')
      .attr('id', DOT_PATTERN_ID)
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', DOT_GRID)
      .attr('height', DOT_GRID)
    dots
      .append('circle')
      .attr('cx', 1)
      .attr('cy', 1)
      .attr('r', 1)
      .attr('fill', T.ink)
      .attr('fill-opacity', DOT_OPACITY)
    svg
      .append('rect')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', `url(#${DOT_PATTERN_ID})`)
      .attr('pointer-events', 'none')

    // 간선을 켤 때의 색은 출발(공급자) 노드를 따른다 — 어느 시장의 기업에서 뻗어 나온 관계인지 읽힌다
    const categoryOf = new Map(nodes.map((n) => [n.id, nodeCategory(n)]))
    const labelOf = new Map(nodes.map((n) => [n.id, n.label]))
    const sourceColor = (l: GraphLink) => {
      const c = categoryOf.get(endId(l.source))
      return c ? CATEGORY_COLORS[c] : T.edge
    }

    const g = svg.append('g')
    let zoomK = 1
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        dots.attr('patternTransform', event.transform.toString())
        // 라벨은 줌 레벨로 켜고 끈다(LOD). 하이라이트 중엔 paint()가 관련 라벨만 남기므로 건드리지 않는다.
        zoomK = event.transform.k
        if (!highlightRef.current) label.attr('opacity', labelLod)
        // sourceEvent가 있으면 휠/드래그 등 사용자 제스처
        if (event.sourceEvent) userMovedRef.current = true
      })
    svg.call(zoom)
    zoomRef.current = zoom
    userMovedRef.current = false
    fitTransformRef.current = d3.zoomIdentity

    // === EDGES ===
    // 테이퍼 곡선 — 공급자 쪽이 굵고 수요자 쪽으로 가늘어져 화살촉 없이 방향이 읽힌다.
    // fill로 그리는 닫힌 도형이라 굵기는 tick에서 path로 정해지고, 강조는 색·불투명도로만 준다.
    const link = g
      .append('g')
      .selectAll<SVGPathElement, GraphLink>('path')
      .data(links)
      .join('path')
      .attr('fill', T.edge)
      .attr('fill-opacity', edgeOpacity)
      .attr('pointer-events', 'none')

    // === EDGE HIT AREAS === 곡선 중심선에 넓은 투명 stroke
    const linkHit = g
      .append('g')
      .selectAll<SVGPathElement, GraphLink>('path')
      .data(links)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 14)
      .attr('cursor', 'pointer')

    // === CENTER GLOW === 중심만 같은 색의 옅은 후광을 두른다 — 화면에서 유일한 초점
    const glow = g
      .append('g')
      .selectAll<SVGCircleElement, GraphNode>('circle')
      .data(nodes.filter((n) => n.id === centerId))
      .join('circle')
      .attr('r', (d) => radius(d) + CENTER_GLOW)
      .attr('fill', (d) => nodeColor(d))
      .attr('fill-opacity', 0.14)
      .attr('pointer-events', 'none')

    // === NODES === 작은 채움 점. 흰 테두리로 간선과 떼어 놓는다
    const node = g
      .append('g')
      .selectAll<SVGCircleElement, GraphNode>('circle')
      .data(nodes)
      .join('circle')
      .attr('r', radius)
      .attr('fill', (d) => nodeColor(d))
      .attr('stroke', T.paper)
      .attr('stroke-width', 1.5)
      .attr('pointer-events', 'none')

    // === LABELS === 점 아래 지도 라벨. 흰 외곽선(paint-order)으로 간선 위에서도 읽힌다
    const label = g
      .append('g')
      .selectAll<SVGTextElement, GraphNode>('text')
      .data(nodes)
      .join('text')
      .text((d) => truncateLabel(d.label))
      .attr('font-size', (d) => (d.id === centerId ? CENTER_LABEL_SIZE : LABEL_SIZE))
      .attr('font-weight', (d) => (d.id === centerId ? 600 : 500))
      .attr('fill', T.ink)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'hanging')
      .attr('stroke', T.canvas)
      .attr('stroke-width', 3)
      .attr('stroke-linejoin', 'round')
      .attr('paint-order', 'stroke')
      .attr('pointer-events', 'none')

    /** 줌아웃 상태에서는 허브·중심 라벨만 남긴다 — 168개 라벨이 겹치면 아무것도 못 읽는다 */
    const labelLod = (d: GraphNode) => (zoomK >= LABEL_MIN_ZOOM || isHub(d) ? 1 : 0)
    label.attr('opacity', labelLod)

    // === NODE HIT AREAS === 점이 작아 커서·손가락이 놓치지 않도록 넓힌다. 라벨 위에 올려 클릭을 가로채지 않게 한다
    const nodeHit = g
      .append('g')
      .selectAll<SVGCircleElement, GraphNode>('circle')
      .data(nodes)
      .join('circle')
      .attr('r', (d) => Math.max(radius(d) + 6, HIT_RADIUS))
      .attr('fill', 'transparent')
      .attr('cursor', 'pointer')

    // ===== 하이라이트 =====
    // 노드 강조·간선 강조·해제가 전부 이 한 경로를 지난다.
    function paint(spec: HighlightSpec | null) {
      if (!spec) {
        node.attr('opacity', 1).attr('stroke', T.paper).attr('stroke-width', 1.5)
        glow.attr('opacity', 1)
        link.attr('fill', T.edge).attr('fill-opacity', edgeOpacity)
        label.attr('opacity', labelLod)
        return
      }

      const { focus, neighbors, isLinkOn } = spec
      const isRelevant = (id: string) => focus.has(id) || neighbors.has(id)

      node
        .attr('opacity', (d) => (isRelevant(d.id) ? 1 : DIM))
        // 선택 노드는 잉크색 링 — 어떤 채움색 위에서도 "여기"로 읽힌다
        .attr('stroke', (d) => (focus.has(d.id) ? T.ink : T.paper))
        .attr('stroke-width', (d) => (focus.has(d.id) ? 2 : 1.5))
      glow.attr('opacity', (d) => (isRelevant(d.id) ? 1 : DIM))
      // 켜진 간선만 제 색(출발 노드 색)을 입는다 — 평소의 슬레이트와 대비되어 관계가 튀어나온다
      link
        .attr('fill', (l) => (isLinkOn(l) ? sourceColor(l) : T.edge))
        .attr('fill-opacity', (l) => (isLinkOn(l) ? 0.85 : 0.08))
      // 관련 노드의 라벨은 줌과 무관하게 보인다 — 무엇을 골랐는지 이름으로 확인해야 한다
      label.attr('opacity', (d) => (isRelevant(d.id) ? 1 : labelLod(d) * DIM_LABEL))
    }

    /** 노드 강조 — 대상에서 hops단계 안에 드는 노드·간선만 남기고 나머지를 흐린다 */
    function nodesSpec(ids: string[], hops: number): HighlightSpec {
      const focus = new Set(ids)
      const distance = bfsDistances(ids, adjacency, hops)
      const neighbors = new Set<string>()
      distance.forEach((d, id) => {
        if (d > 0) neighbors.add(id)
      })
      return {
        focus,
        neighbors,
        // 마지막 홉 노드끼리 이어진 간선은 탐색에 쓰이지 않았으므로 켜지 않는다.
        // 다만 대상끼리 이어진 간선은 언제나 켠다 — hops가 0일 때 남는 것이 이것뿐이다.
        isLinkOn: (l) => {
          const from = distance.get(endId(l.source))
          const to = distance.get(endId(l.target))
          if (from == null || to == null) return false
          return Math.min(from, to) < hops || (from === 0 && to === 0)
        },
      }
    }

    /** 간선 강조 — 양 끝 노드와 그 간선만 남긴다 */
    function linkSpec(linkId: string): HighlightSpec | null {
      const target = links.find((l) => l.id === linkId)
      if (!target) return null
      return {
        focus: new Set([endId(target.source), endId(target.target)]),
        neighbors: new Set<string>(),
        isLinkOn: (l) => l.id === linkId,
      }
    }

    const applyHighlight = (h: GraphHighlight | null) =>
      paint(h == null ? null : h.kind === 'link' ? linkSpec(h.id) : nodesSpec(h.ids, h.hops ?? 1))

    d3StateRef.current = { nodes, applyHighlight }
    // 필터 변경 등으로 그래프를 다시 그렸을 때도 현재 선택 강조를 유지한다
    applyHighlight(highlightRef.current)

    // ===== node interactions =====
    nodeHit
      .on('mouseover', (event: MouseEvent, d) => {
        if (!highlightRef.current) applyHighlight({ kind: 'nodes', ids: [d.id] })
        showTooltip(tooltip, event, d.label, CATEGORY_LABELS[nodeCategory(d)], nodeColor(d))
      })
      .on('mousemove', (event: MouseEvent) => moveTooltip(tooltip, event))
      .on('mouseout', () => {
        applyHighlight(highlightRef.current)
        hideTooltip(tooltip)
      })
      .on('click', (event: MouseEvent, d) => {
        event.stopPropagation()
        handlersRef.current.onNodeClick(d)
      })
      .on('dblclick', (event: MouseEvent, d) => {
        // svg의 줌(dblclick.zoom)까지 올라가면 재중심과 확대가 동시에 일어난다
        event.stopPropagation()
        handlersRef.current.onNodeDoubleClick?.(d)
      })

    // ===== edge interactions =====
    linkHit
      .on('mouseover', (event: MouseEvent, d) => {
        if (!highlightRef.current) applyHighlight({ kind: 'link', id: d.id })
        showTooltip(
          tooltip,
          event,
          `${labelOf.get(endId(d.source)) ?? ''} → ${labelOf.get(endId(d.target)) ?? ''}`,
          (PREDICATE_LABELS[d.type] ?? d.type) + (d.item ? ` · ${d.item.text}` : ''),
          sourceColor(d),
        )
      })
      .on('mousemove', (event: MouseEvent) => moveTooltip(tooltip, event))
      .on('mouseout', () => {
        applyHighlight(highlightRef.current)
        hideTooltip(tooltip)
      })
      .on('click', (event: MouseEvent, d) => {
        event.stopPropagation()
        handlersRef.current.onLinkClick(d)
      })

    svg.on('click', (event: MouseEvent) => {
      if (event.target === svgRef.current) handlersRef.current.onBackgroundClick()
    })

    // drag — 히트 영역을 잡아 끈다 (점 자체는 pointer-events가 없다)
    nodeHit.call(
      d3
        .drag<SVGCircleElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          // 중심은 놓은 자리에 그대로 못 박힌다 — 나머지는 다시 힘에 맡긴다
          if (d.id === centerId) return
          d.fx = null
          d.fy = null
        }),
    )

    // ===== simulation (spread-out force layout) =====
    // 기억한 좌표가 하나라도 있으면 이어 그린다 — 홉을 바꿔도 오른쪽에 있던 기업이 왼쪽으로 가지 않는다
    const remembered = positionsRef.current
    const incremental = nodes.some((n) => remembered.has(n.id))
    if (incremental) placeIncrementally(nodes, links, remembered, width, height)
    else seedPositions(nodes, width, height)

    // 중심은 제자리에 못 박는다 — 처음엔 캔버스 가운데, 이어 그릴 땐 기억한 자리. 그래프가 통째로 떠다니지 않는다
    const center = nodes.find((n) => n.id === centerId)
    if (center) {
      if (!incremental) {
        center.x = width / 2
        center.y = height / 2
      }
      center.fx = center.x
      center.fy = center.y
    }

    // 점이 작아진 만큼 반발력은 상수항으로 받치고, 충돌 반지름에 라벨 높이를 더해 이름이 겹치지 않게 한다.
    // distanceMax로 먼 노드끼리는 밀지 않게 해 전체가 화면 밖으로 번지는 것을 막는다.
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance((l) => radius(l.source as GraphNode) + radius(l.target as GraphNode) + LINK_LENGTH)
          // 느슨하게 — 잎 노드가 한 고리에 몰리지 않고 반발력에 밀려 여러 겹으로 퍼진다
          .strength(0.12),
      )
      .force(
        'charge',
        d3
          .forceManyBody()
          .strength((d) => -(CHARGE_BASE + CHARGE_PER_PX * radius(d as GraphNode)))
          .distanceMax(420),
      )
      // 기억한 자리가 있는 노드는 그 자리로, 새 노드는 캔버스 중심으로 약하게 당긴다.
      // 앵커가 없으면 잎 노드의 각도는 이웃끼리의 반발만으로 정해져 홉을 바꿀 때마다 자리가 뒤바뀐다.
      .force(
        'x',
        d3
          .forceX<GraphNode>((d) => remembered.get(d.id)?.x ?? width / 2)
          .strength((d) => (remembered.has(d.id) ? ANCHOR_STRENGTH : 0.06)),
      )
      .force(
        'y',
        d3
          .forceY<GraphNode>((d) => remembered.get(d.id)?.y ?? height / 2)
          .strength((d) => (remembered.has(d.id) ? ANCHOR_STRENGTH : 0.06)),
      )
      .force(
        'collide',
        d3
          .forceCollide()
          .radius((d) => radius(d as GraphNode) + COLLIDE_PAD)
          .strength(0.9),
      )
      .alphaMin(0.01)
      .alphaDecay(0.025)
      .velocityDecay(0.35)
      .stop()

    /** 현재 좌표를 화면에 옮긴다 — 예열 직후 한 번, 이후 tick마다 */
    const render = () => {
      // 간선은 노드 중심이 아니라 점 둘레에서 시작·끝나고, 살짝 휜 곡선을 따라 폭이 줄어든다
      const curveOf = new Map<string, Curve>()
      links.forEach((l) => curveOf.set(l.id, edgeCurve(trimToNodeEdges(l, radius))))
      const curve = (d: GraphLink) => curveOf.get(d.id)!

      link.attr('d', (d) => taperedEdgePath(curve(d), edgeWidth(d), TAPER_TIP))
      linkHit.attr('d', (d) => curvePath(curve(d)))
      glow.attr('cx', (d) => d.x!).attr('cy', (d) => d.y!)
      node.attr('cx', (d) => d.x!).attr('cy', (d) => d.y!)
      nodeHit.attr('cx', (d) => d.x!).attr('cy', (d) => d.y!)
      label.attr('transform', (d) => `translate(${d.x!},${d.y! + radius(d) + LABEL_GAP})`)
      nodes.forEach((n) => remembered.set(n.id, { x: n.x!, y: n.y! }))
    }

    // 동기 예열 — 첫 프레임부터 자리 잡힌 그래프를 보인다. "터지고 나서 모이는" 애니메이션이 없고,
    // 카메라 맞춤도 안정화를 기다리지 않아 rAF가 멈추는 숨은 탭에서도 결정적으로 끝난다.
    // 이어 그릴 땐 알파를 낮춰 기존 배치를 흔들지 않고 새 노드만 자리를 찾게 한다.
    simulation.alpha(incremental ? INCREMENTAL_ALPHA : 1).tick(WARMUP_TICKS)
    render()
    // 특정 요소를 선택한 채 다시 그린 경우(필터 변경 등)에는 카메라를 건드리지 않는다.
    // 이어 그릴 땐 카메라도 미끄러지듯 옮겨 홉 전환이 한 장면으로 이어진다.
    if (!movesCamera(highlightRef.current)) fitToView(incremental ? 450 : 0)

    // 이후에는 낮은 알파로 가볍게 이어 가며(드래그 시 다시 데워진다) 잔여 겹침을 푼다
    simulation.on('tick', render).alpha(0.2).restart()

    /** 노드와 그 아래 라벨까지 보이도록 카메라를 맞춘다 */
    function fitToView(duration: number) {
      const view = computeFitView(nodes, width, height, { padding: 48 + maxRadius })
      if (!view || !svgRef.current) return
      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(view.scale)
        .translate(-view.cx, -view.cy)
      fitTransformRef.current = transform
      svg.transition().duration(duration).call(zoom.transform, transform)
    }

    simulationRef.current = simulation

    return () => {
      simulation.stop()
    }
  }, [data, sized, sizeRef, getFilteredData, centerId])

  // ========== 외부 선택 반영 + 카메라 이동 ==========
  useEffect(() => {
    highlightRef.current = highlight
    const state = d3StateRef.current
    if (!state) return
    state.applyHighlight(highlight)

    const byId = (id: string) => state.nodes.find((n) => n.id === id)

    /** 이전에 중앙 고정했던 노드들을 해제 — 중심 노드는 원래 못 박혀 있으므로 그대로 둔다 */
    const releaseFixed = () => {
      fixedIdsRef.current.forEach((id) => {
        const n = byId(id)
        if (n && n.id !== centerId) {
          n.fx = null
          n.fy = null
        }
      })
      fixedIdsRef.current = []
    }

    if (!movesCamera(highlight)) {
      releaseFixed()
      return
    }

    /**
     * 선택 요소를 화면 중앙으로. focus 노드들을 현재 위치에 고정(fx/fy)해
     * 라이브 시뮬레이션 드리프트를 막고, 카메라를 그 중심으로 이동시킨다.
     * fit=true면 두 노드가 모두 보이도록 스케일을 맞춘다(간선용).
     */
    const focusOn = (ids: string[], fit: boolean) => {
      if (!svgRef.current || !zoomRef.current) return
      const focus = ids
        .map(byId)
        .filter((n): n is GraphNode => !!n && n.x != null && n.y != null)
      if (focus.length === 0) return

      releaseFixed()
      focus.forEach((n) => {
        n.fx = n.x!
        n.fy = n.y!
      })
      fixedIdsRef.current = focus.map((n) => n.id)

      const { w: width, h: height } = sizeRef.current
      const xs = focus.map((n) => n.x!)
      const ys = focus.map((n) => n.y!)
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2

      let scale = 1.4
      if (fit) {
        const spanX = Math.max(...xs) - Math.min(...xs) + 220
        const spanY = Math.max(...ys) - Math.min(...ys) + 220
        scale = Math.max(0.5, Math.min(1.6, (0.9 * width) / spanX, (0.9 * height) / spanY))
      }
      d3.select(svgRef.current)
        .transition()
        .duration(650)
        .call(
          zoomRef.current.transform,
          d3.zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-cx, -cy),
        )
    }

    if (highlight.kind === 'link') {
      const ends = linkEnds(data, highlight.id)
      if (ends) focusOn(ends, true)
      return
    }
    focusOn(highlight.ids, false)
  }, [highlight, data, sizeRef, centerId])

  return (
    <div ref={containerRef} className="relative size-full" style={{ background: T.canvas }}>
      <svg ref={svgRef} className="size-full" />
      <GraphTooltip ref={tooltipRef} />
    </div>
  )
})

/** 배경 도트 격자 — 간격과 진하기. 눈에 띄지 않되 팬할 때 움직임이 느껴질 만큼 */
const DOT_PATTERN_ID = 'graph-dots'
const DOT_GRID = 24
const DOT_OPACITY = 0.07

/** 중심 후광이 점 바깥으로 나오는 폭 */
const CENTER_GLOW = 10
/** 간선 도착(수요자) 쪽 끝 폭 — 거의 점으로 모인다 */
const TAPER_TIP = 0.5

/** 라벨 크기와 점과의 간격 */
const LABEL_SIZE = 11
const CENTER_LABEL_SIZE = 13
const LABEL_GAP = 4
/** 라벨을 전부 보이기 시작하는 줌 배율. 개요(전체 보기)에서는 허브·중심만 남겨 구조가 먼저 읽히게 한다 */
const LABEL_MIN_ZOOM = 1
/** 줌아웃에서도 라벨을 남기는 차수 기준 */
const HUB_DEGREE = 3
/** 긴 이름은 잘라 라벨 폭을 제한한다 — 전체 이름은 툴팁·상세 패널에 있다 */
const LABEL_MAX_CHARS = 12

/** 노드 클릭 영역 최소 반지름 */
const HIT_RADIUS = 12

/** 강조 밖 요소의 불투명도 — 완전히 죽이지 않고 맥락으로 남긴다 */
const DIM = 0.25
const DIM_LABEL = 0.2

/** 동기 예열 틱 수 — 알파가 1에서 0.01 근처까지 내려와 배치가 거의 끝나는 양 */
const WARMUP_TICKS = 200
/** 이어 그릴 때의 시작 알파 — 기존 배치를 흔들지 않을 만큼만 새 노드에 자리를 찾아 준다 */
const INCREMENTAL_ALPHA = 0.4
/** 기억한 자리로 당기는 힘 — 반발력에 밀려 조금 벌어질 순 있어도 각도가 뒤바뀌진 않는 세기 */
const ANCHOR_STRENGTH = 0.3

/**
 * 힘 튜닝 — 점이 작아 상수항으로 반발을 받치고, 충돌 반지름에는 점 아래 라벨(폭 ~50px)이
 * 이웃과 겹치지 않을 만큼의 여유를 더한다.
 */
const LINK_LENGTH = 84
const CHARGE_BASE = 120
const CHARGE_PER_PX = 12
const COLLIDE_PAD = 22

function truncateLabel(label: string): string {
  return label.length > LABEL_MAX_CHARS ? `${label.slice(0, LABEL_MAX_CHARS - 1)}…` : label
}

/** 이 강조가 카메라를 가져가는가 — 배경 강조(camera:false)와 해제는 화면을 건드리지 않는다 */
function movesCamera(highlight: GraphHighlight | null): highlight is GraphHighlight {
  if (!highlight) return false
  return highlight.kind === 'link' || highlight.camera !== false
}

/** 간선 id로 양 끝 노드 id를 찾는다 */
function linkEnds(data: GraphData, linkId: string): [string, string] | null {
  const link = data.links.find((l) => l.id === linkId)
  return link ? [endId(link.source), endId(link.target)] : null
}
