import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import * as d3 from 'd3'
import {
  endId,
  ALL_CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  NODE_LABEL_COLOR,
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
  edgeWidth,
  labelMaxWidth,
  nodeFontSize,
  seedPositions,
  NODE_RADIUS,
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

/** 캔버스에서 강조할 대상 — 부모(선택 상태)가 유일한 출처다 */
export type GraphHighlight =
  /**
   * hops: 대상에서 몇 단계까지 따라가 강조할지 (기본 1). 0이면 대상 노드와 그들 사이 관계만.
   * camera: 강조 대상으로 카메라를 옮기고 그 노드들을 제자리에 고정할지 (기본 true).
   *   상시 켜 두는 배경 강조에는 false를 준다 — 그렇지 않으면 화면이 계속 끌려다니고
   *   레이아웃이 잦아든 뒤의 "전체 보기" 자동 맞춤도 일어나지 않는다.
   */
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
  /** 지금 조회의 중심 노드 — 바깥에 링을 둘러 "여기가 어디인지" 남긴다 */
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
  focusStrokeWidth: number
  linkOnOpacity: number
  linkOffOpacity: number
  linkWidthBump: number
}

interface D3State {
  nodes: GraphNode[]
  applyHighlight: (highlight: GraphHighlight | null) => void
}

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
    // 크기는 지금 화면에 있는 노드들 사이의 상대 차수로 결정된다
    const radius = createRadiusScale(nodes, degree)
    const maxRadius = nodes.length ? Math.max(...nodes.map(radius)) : NODE_RADIUS.min

    // arrow markers — 화살촉은 간선 색을 따라가야 하므로 출발 노드 분류별로 하나씩 만든다
    const defs = svg.append('defs')
    const addArrowMarker = (id: string, fill: string) => {
      defs
        .append('marker')
        .attr('id', id)
        .attr('viewBox', `0 ${-ARROW_LENGTH / 2} ${ARROW_LENGTH} ${ARROW_LENGTH}`)
        // userSpaceOnUse — 기본값(strokeWidth)은 화살촉이 선 굵기에 비례해 커져
        // 굵은 간선에서 과하게 커지고 끝 위치도 굵기마다 달라진다.
        .attr('markerUnits', 'userSpaceOnUse')
        // 간선을 이미 노드 둘레에서 잘랐으므로 화살촉 끝을 선 끝에 정확히 맞춘다
        .attr('refX', ARROW_LENGTH)
        .attr('refY', 0)
        .attr('markerWidth', ARROW_LENGTH)
        .attr('markerHeight', ARROW_LENGTH)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', `M0,${-ARROW_HALF_WIDTH}L${ARROW_LENGTH},0L0,${ARROW_HALF_WIDTH}`)
        .attr('fill', fill)
        // 선의 stroke-opacity는 마커에 상속되지 않아 직접 맞춰준다
        .attr('fill-opacity', EDGE_OPACITY)
    }
    ALL_CATEGORIES.forEach((c) => addArrowMarker(arrowId(c), CATEGORY_COLORS[c]))
    addArrowMarker(ARROW_OFF_ID, T.hairlineSoft)

    // 간선의 색은 출발 노드를 따른다 — 어느 시장의 기업에서 뻗어 나온 관계인지 색으로 읽힌다
    const categoryOf = new Map(nodes.map((n) => [n.id, nodeCategory(n)]))
    const labelOf = new Map(nodes.map((n) => [n.id, n.label]))
    const sourceCategory = (l: GraphLink) => categoryOf.get(endId(l.source))
    const linkColor = (l: GraphLink) => {
      const c = sourceCategory(l)
      return c ? CATEGORY_COLORS[c] : T.hairline
    }
    const linkArrow = (l: GraphLink) => {
      const c = sourceCategory(l)
      return `url(#${c ? arrowId(c) : ARROW_OFF_ID})`
    }

    const g = svg.append('g')
    let zoomK = 1
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        // 서술어 라벨은 가까이 봐야 읽히므로 줌 레벨로 켜고 끈다(LOD).
        // 하이라이트 중엔 paint()가 관련 라벨만 남기므로 건드리지 않는다.
        zoomK = event.transform.k
        if (!highlightRef.current) {
          linkLabel.attr('opacity', zoomK >= LINK_LABEL_MIN_ZOOM ? 1 : 0)
        }
        // sourceEvent가 있으면 휠/드래그 등 사용자 제스처
        if (event.sourceEvent) userMovedRef.current = true
      })
    svg.call(zoom)
    zoomRef.current = zoom
    userMovedRef.current = false
    fitTransformRef.current = d3.zoomIdentity

    // === LINKS (visible) ===
    const link = g
      .append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', linkColor)
      .attr('stroke-opacity', EDGE_OPACITY)
      .attr('stroke-width', edgeWidth)
      .attr('marker-end', linkArrow)
      .attr('pointer-events', 'none')

    // === LINK HIT AREAS (transparent, wide, clickable) ===
    const linkHit = g
      .append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', 'transparent')
      .attr('stroke-width', (l) => Math.max(14, edgeWidth(l) + 12))
      .attr('cursor', 'pointer')

    // === LINK LABELS (predicate) ===
    // 간선 중간에 "끼워 넣는다" — 배경판이 선을 끊고 그 자리에 관계 타입이 들어간다.
    // 각 라벨은 tick마다 간선 중점으로 옮기고 간선 방향으로 회전시킨다.
    const linkLabel = g
      .append('g')
      .selectAll<SVGGElement, GraphLink>('g')
      .data(links)
      .join('g')
      .attr('pointer-events', 'none')
      // 초기(전체 보기) 배율에선 숨김 — 줌인 또는 하이라이트로 드러난다
      .attr('opacity', 0)

    const linkLabelPlate = linkLabel.append('rect').attr('fill', T.canvas).attr('rx', 2)

    const linkLabelText = linkLabel
      .append('text')
      .text((d) => PREDICATE_LABELS[d.type] ?? d.type)
      .attr('font-size', LINK_LABEL_FONT_SIZE)
      .attr('font-weight', 500)
      .attr('letter-spacing', 0.2)
      .attr('fill', T.muted)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')

    // 서술어마다 길이가 달라 배경판은 실제 렌더 폭을 재서 맞춘다
    const plates = linkLabelPlate.nodes()
    const plateWidth = new Map<string, number>()
    linkLabelText.each(function (d, i) {
      const box = this.getBBox()
      const width = box.width + LINK_LABEL_PAD.x * 2
      plateWidth.set(d.id, width)
      d3.select(plates[i])
        .attr('x', box.x - LINK_LABEL_PAD.x)
        .attr('y', box.y - LINK_LABEL_PAD.y)
        .attr('width', width)
        .attr('height', box.height + LINK_LABEL_PAD.y * 2)
    })

    // === CENTER HALO ===
    // 조회의 중심을 바깥 링으로 표시한다 — 재중심 탐색에서 "지금 어디를 보고 있는지"를 캔버스에 남긴다.
    // 노드 채움과 사이를 띄워 KOSPI(블루) 노드 위에서도 링이 따로 읽힌다.
    const halo = g
      .append('g')
      .selectAll<SVGCircleElement, GraphNode>('circle')
      .data(nodes.filter((n) => n.id === centerId))
      .join('circle')
      .attr('r', (d) => radius(d) + CENTER_HALO_GAP)
      .attr('fill', 'none')
      .attr('stroke', T.primary)
      .attr('stroke-width', 2)
      .attr('pointer-events', 'none')

    // === NODES ===
    const node = g
      .append('g')
      .selectAll<SVGCircleElement, GraphNode>('circle')
      .data(nodes)
      .join('circle')
      .attr('r', radius)
      .attr('fill', (d) => nodeColor(d))
      .attr('stroke', T.canvas)
      .attr('stroke-width', 1.5)
      .attr('cursor', 'pointer')

    // === NODE LABELS (원 안쪽) ===
    // 이름이 원에 안 들어가면 폰트를 9px까지 줄이고, 그래도 안 되면 두 줄로 감싼다.
    // 넘치는 줄만 말줄임 — 라벨은 항상 원 안에 머문다 (전체 이름은 툴팁·상세 패널에서).
    const labelFontSize = new Map<string, number>()
    const label = g
      .append('g')
      .selectAll<SVGTextElement, GraphNode>('text')
      .data(nodes)
      .join('text')
      .attr('font-weight', 600)
      .attr('fill', NODE_LABEL_COLOR)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('pointer-events', 'none')
      .each(function (d) {
        labelFontSize.set(
          d.id,
          layoutNodeLabel(this, d.label, labelMaxWidth(radius(d)), nodeFontSize(radius(d))),
        )
      })
      .attr('font-size', (d) => labelFontSize.get(d.id)!)

    // ===== 하이라이트 =====
    // 노드 강조·간선 강조·해제가 전부 이 한 경로를 지난다.
    function paint(spec: HighlightSpec | null) {
      if (!spec) {
        node.attr('opacity', 1).attr('stroke', T.canvas).attr('stroke-width', 1.5)
        link
          .attr('stroke', linkColor)
          .attr('stroke-opacity', EDGE_OPACITY)
          .attr('stroke-width', edgeWidth)
          .attr('marker-end', linkArrow)
        label.attr('opacity', 0.85)
        halo.attr('opacity', 1)
        linkLabel.attr('opacity', zoomK >= LINK_LABEL_MIN_ZOOM ? 1 : 0)
        linkLabelText.attr('fill', T.muted)
        return
      }

      const { focus, neighbors, isLinkOn } = spec
      const isRelevant = (id: string) => focus.has(id) || neighbors.has(id)

      node
        .attr('opacity', (d) => (isRelevant(d.id) ? 1 : 0.12))
        .attr('stroke', (d) =>
          focus.has(d.id) ? T.primary : neighbors.has(d.id) ? T.canvas : T.hairlineSoft,
        )
        .attr('stroke-width', (d) =>
          focus.has(d.id) ? spec.focusStrokeWidth : neighbors.has(d.id) ? 2 : 0.5,
        )
      link
        // 강조된 간선도 제 색(출발 엔티티 색)을 유지한다 — 강조는 굵기·투명도로 준다
        .attr('stroke', (l) => (isLinkOn(l) ? linkColor(l) : T.hairlineSoft))
        .attr('stroke-opacity', (l) => (isLinkOn(l) ? spec.linkOnOpacity : spec.linkOffOpacity))
        .attr('stroke-width', (l) =>
          isLinkOn(l) ? edgeWidth(l) + spec.linkWidthBump : edgeWidth(l) * 0.5,
        )
        .attr('marker-end', (l) => (isLinkOn(l) ? linkArrow(l) : `url(#${ARROW_OFF_ID})`))
      label.attr('opacity', (d) => (isRelevant(d.id) ? 1 : 0.08))
      halo.attr('opacity', (d) => (isRelevant(d.id) ? 1 : 0.15))
      linkLabel.attr('opacity', (l) => (isLinkOn(l) ? 1 : 0.1))
      linkLabelText.attr('fill', (l) => (isLinkOn(l) ? T.ink : T.muted))
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
        focusStrokeWidth: 4,
        linkOnOpacity: 0.9,
        linkOffOpacity: 0.3,
        linkWidthBump: 1,
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
        focusStrokeWidth: 3,
        linkOnOpacity: 0.95,
        linkOffOpacity: 0.25,
        linkWidthBump: 1.5,
      }
    }

    const applyHighlight = (h: GraphHighlight | null) =>
      paint(h == null ? null : h.kind === 'link' ? linkSpec(h.id) : nodesSpec(h.ids, h.hops ?? 1))

    d3StateRef.current = { nodes, applyHighlight }
    // 필터 변경 등으로 그래프를 다시 그렸을 때도 현재 선택 강조를 유지한다
    applyHighlight(highlightRef.current)

    // ===== node interactions =====
    node
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
          linkColor(d),
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

    // drag
    node.call(
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
          d.fx = null
          d.fy = null
        }),
    )

    // ===== simulation (spread-out force layout) =====
    seedPositions(nodes, width, height)

    /** 이번 레이아웃에서 자동 맞춤을 이미 수행했는지 */
    let fitted = false

    // 힘은 노드 크기에 연동한다 — 큰 노드일수록 더 밀어내고, 간선도 두 반지름만큼 길어진다.
    // distanceMax로 먼 노드끼리는 밀지 않게 해 전체가 화면 밖으로 번지는 것을 막는다.
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance((l) => radius(l.source as GraphNode) + radius(l.target as GraphNode) + 70)
          .strength(0.18),
      )
      .force(
        'charge',
        d3
          .forceManyBody()
          .strength((d) => -22 * radius(d as GraphNode))
          .distanceMax(maxRadius * 9),
      )
      .force('x', d3.forceX(width / 2).strength(0.06))
      .force('y', d3.forceY(height / 2).strength(0.06))
      .force(
        'collide',
        d3
          .forceCollide()
          .radius((d) => radius(d as GraphNode) + 10)
          .strength(0.9),
      )
      .alpha(0.9)
      .alphaMin(0.01)
      .alphaDecay(0.025)
      .velocityDecay(0.35)
      .on('tick', () => {
        // 간선은 노드 중심이 아니라 원 둘레에서 시작·끝난다 (화살촉이 큰 노드에 묻히지 않도록)
        const segment = new Map<string, Segment>()
        links.forEach((l) => segment.set(l.id, trimToNodeEdges(l, radius)))
        const seg = (d: GraphLink) => segment.get(d.id)!

        link
          .attr('x1', (d) => seg(d).x1)
          .attr('y1', (d) => seg(d).y1)
          .attr('x2', (d) => seg(d).x2)
          .attr('y2', (d) => seg(d).y2)
        linkHit
          .attr('x1', (d) => seg(d).x1)
          .attr('y1', (d) => seg(d).y1)
          .attr('x2', (d) => seg(d).x2)
          .attr('y2', (d) => seg(d).y2)
        linkLabel
          .attr('transform', (d) => labelTransform(seg(d)))
          // 배경판이 간선보다 길면 양 끝 노드를 덮는다 — 그런 간선에서는 라벨을 접는다
          // (관계 타입은 호버 툴팁·상세 패널에서 계속 확인할 수 있다)
          .attr('display', (d) =>
            segmentLength(seg(d)) >= (plateWidth.get(d.id) ?? 0) ? null : 'none',
          )
        node.attr('cx', (d) => d.x!).attr('cy', (d) => d.y!)
        halo.attr('cx', (d) => d.x!).attr('cy', (d) => d.y!)
        // 두 줄 라벨의 tspan(x=0 기준)이 함께 움직이도록 좌표는 transform으로 옮긴다
        label.attr('transform', (d) => `translate(${d.x!},${d.y!})`)

        // 레이아웃이 잦아들면 그래프 전체가 보이도록 카메라를 한 번 맞춘다.
        // 사용자가 이미 확대/이동했거나 특정 요소를 선택한 상태면 건드리지 않는다.
        if (fitted || simulation.alpha() > 0.05) return
        fitted = true
        if (userMovedRef.current || movesCamera(highlightRef.current)) return
        fitToView(500)
      })

    /** 노드 전체가 보이도록 카메라를 맞춘다 (바깥 원의 반지름까지 감안) */
    function fitToView(duration: number) {
      const view = computeFitView(nodes, width, height, { padding: 32 + maxRadius })
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

    /** 이전에 중앙 고정했던 노드들을 해제 */
    const releaseFixed = () => {
      fixedIdsRef.current.forEach((id) => {
        const n = byId(id)
        if (n) {
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
  }, [highlight, data, sizeRef])

  return (
    <div ref={containerRef} className="relative size-full bg-background">
      <svg ref={svgRef} className="size-full" />
      <GraphTooltip ref={tooltipRef} />
    </div>
  )
})

interface Segment {
  x1: number
  y1: number
  x2: number
  y2: number
}

/** 화살촉이 노드에 닿지 않도록 두는 여유 */
const ARROW_GAP = 3

/** 화살촉 크기 — 선 굵기와 무관한 고정 크기(userSpaceOnUse) */
const ARROW_LENGTH = 6
const ARROW_HALF_WIDTH = 2.5

/** 간선(과 화살촉)의 기본 불투명도 */
const EDGE_OPACITY = 0.85
/** 서술어 라벨이 보이기 시작하는 줌 배율 — 초기 전체 보기(fit 상한 1.2)에선 숨긴다 */
const LINK_LABEL_MIN_ZOOM = 1.25

/** 출발 노드 분류별 화살촉 마커 id */
const arrowId = (category: NodeCategory) => `arrow-${category}`
/** 중심 링과 노드 채움 사이 간격 */
const CENTER_HALO_GAP = 5
/** 필터·강조로 흐려진 간선용 화살촉 */
const ARROW_OFF_ID = 'arrow-off'

/** 간선 위 관계 타입 라벨 */
const LINK_LABEL_FONT_SIZE = 9
/** 라벨 배경판이 간선을 끊어 보이게 하는 여백 */
const LINK_LABEL_PAD = { x: 4, y: 1.5 }

/** 이 강조가 카메라를 가져가는가 — 배경 강조(camera:false)와 해제는 화면을 건드리지 않는다 */
function movesCamera(highlight: GraphHighlight | null): highlight is GraphHighlight {
  if (!highlight) return false
  return highlight.kind === 'link' || highlight.camera !== false
}

function segmentLength(seg: Segment): number {
  return Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1)
}

/**
 * 라벨을 간선 중점에 놓고 간선 방향으로 눕힌다.
 * 각도가 뒤집힌 구간(|angle| > 90°)에서는 글자가 거꾸로 서므로 180° 돌려 읽히게 한다.
 */
function labelTransform(seg: Segment): string {
  const mx = (seg.x1 + seg.x2) / 2
  const my = (seg.y1 + seg.y2) / 2
  let angle = (Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1) * 180) / Math.PI
  if (angle > 90) angle -= 180
  else if (angle < -90) angle += 180
  return `translate(${mx},${my}) rotate(${angle})`
}

/** 간선을 두 노드의 원 둘레 사이 구간으로 자른다 */
function trimToNodeEdges(link: GraphLink, radius: (node: GraphNode) => number): Segment {
  const s = link.source as GraphNode
  const t = link.target as GraphNode
  const dx = t.x! - s.x!
  const dy = t.y! - s.y!
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const from = radius(s)
  const to = radius(t) + ARROW_GAP
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

/** 두 줄 분할점 — 공백이 있으면 중앙에서 가장 가까운 공백, 없으면 글자 수 절반 */
function splitIndex(label: string): number {
  const mid = label.length / 2
  let best = -1
  for (let i = 1; i < label.length - 1; i++) {
    if (label[i] === ' ' && (best === -1 || Math.abs(i - mid) < Math.abs(best - mid))) best = i
  }
  return best === -1 ? Math.ceil(mid) : best
}

/**
 * 노드 이름을 원 안에 배치한다 — 한 줄(폰트 9px까지 축소) → 두 줄 → 말줄임 순서로 시도.
 * 한글·영문 폭이 달라 글자 수가 아니라 실제 렌더 폭으로 판정한다.
 * 좌표는 tick에서 transform으로 옮기므로 tspan은 x=0 기준. 사용한 폰트 크기를 돌려준다.
 */
function layoutNodeLabel(
  el: SVGTextElement,
  label: string,
  maxWidth: number,
  startSize: number,
): number {
  const widthAt = (text: string, size: number) => {
    el.setAttribute('font-size', String(size))
    el.textContent = text
    return el.getComputedTextLength()
  }

  // 1) 한 줄 — 폰트를 줄여 본다 (nodeFontSize 최소치가 9 미만일 수 있어 하한을 함께 낮춘다)
  const minSize = Math.min(9, startSize)
  for (let size = startSize; size >= minSize; size--) {
    if (widthAt(label, size) <= maxWidth) return size
  }

  // 2) 두 줄 분할, 그래도 넘치는 줄만 말줄임
  const fitLine = (line: string): string => {
    if (widthAt(line, minSize) <= maxWidth) return line
    let text = line
    while (text.length > 1) {
      text = text.slice(0, -1)
      if (widthAt(`${text}…`, minSize) <= maxWidth) return `${text}…`
    }
    return line.slice(0, 1)
  }
  const at = splitIndex(label)
  const lines = [fitLine(label.slice(0, at).trim()), fitLine(label.slice(at).trim())]

  el.textContent = ''
  const SVG_NS = 'http://www.w3.org/2000/svg'
  lines.forEach((line, i) => {
    const tspan = document.createElementNS(SVG_NS, 'tspan')
    tspan.setAttribute('x', '0')
    tspan.setAttribute('dy', i === 0 ? '-0.55em' : '1.1em')
    tspan.textContent = line
    el.append(tspan)
  })
  return minSize
}

/** 간선 id로 양 끝 노드 id를 찾는다 */
function linkEnds(data: GraphData, linkId: string): [string, string] | null {
  const link = data.links.find((l) => l.id === linkId)
  return link ? [endId(link.source), endId(link.target)] : null
}
