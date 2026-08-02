import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import * as d3 from 'd3'
import {
  endId,
  NODE_COLORS,
  NODE_TEXT_COLORS,
  PREDICATE_LABELS,
  ENTITY_LABELS,
  type GraphNode,
  type GraphLink,
  type GraphData,
  type EntityType,
  type Predicate,
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
import { GraphTooltip } from '@/components/graph/GraphTooltip'
import { hideTooltip, moveTooltip, showTooltip } from '@/lib/graphTooltip'
import { useCanvasSize, type CanvasSize } from '@/lib/useCanvasSize'
import { T, EDGE_HIGHLIGHT } from '@/lib/graphTheme'

export interface GraphCanvasRef {
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
}

/** 캔버스에서 강조할 대상 — 부모(선택 상태)가 유일한 출처다 */
export type GraphHighlight = { kind: 'nodes'; ids: string[] } | { kind: 'link'; id: string }

interface Props {
  data: GraphData
  onNodeClick: (node: GraphNode) => void
  onLinkClick: (link: GraphLink) => void
  /** 빈 캔버스 클릭 — 선택 해제 */
  onBackgroundClick: () => void
  highlight: GraphHighlight | null
  selectedTypes: Set<EntityType>
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
  { data, onNodeClick, onLinkClick, onBackgroundClick, highlight, selectedTypes, selectedPredicates },
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
    const typeOf = new Map(data.nodes.map((n) => [n.id, n.type]))
    const links = data.links.filter((l) => {
      if (!selectedPredicates.has(l.type)) return false
      const s = typeOf.get(endId(l.source))
      const t = typeOf.get(endId(l.target))
      return !!s && !!t && selectedTypes.has(s) && selectedTypes.has(t)
    })
    const connected = new Set<string>()
    links.forEach((l) => {
      connected.add(endId(l.source))
      connected.add(endId(l.target))
    })
    const nodes = data.nodes.filter((n) => selectedTypes.has(n.type) && connected.has(n.id))
    return { nodes, links }
  }, [data, selectedTypes, selectedPredicates])

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

    // arrow marker
    const defs = svg.append('defs')
    defs
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      // 간선을 이미 노드 둘레에서 잘랐으므로 화살촉 끝(x=7)을 선 끝에 맞춘다
      .attr('refX', 7)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-3L7,0L0,3')
      .attr('fill', T.mutedSoft)

    const g = svg.append('g')
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
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
      .attr('stroke', T.hairline)
      .attr('stroke-opacity', 0.85)
      .attr('stroke-width', edgeWidth)
      .attr('marker-end', 'url(#arrow)')
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

    // === LINK LABELS (predicate; hidden by default) ===
    const linkLabel = g
      .append('g')
      .selectAll<SVGTextElement, GraphLink>('text')
      .data(links)
      .join('text')
      .text((d) => PREDICATE_LABELS[d.type] || d.type)
      .attr('font-size', 10)
      .attr('fill', EDGE_HIGHLIGHT)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('pointer-events', 'none')
      .attr('visibility', 'hidden')

    // === NODES ===
    const node = g
      .append('g')
      .selectAll<SVGCircleElement, GraphNode>('circle')
      .data(nodes)
      .join('circle')
      .attr('r', radius)
      .attr('fill', (d) => NODE_COLORS[d.type] || T.muted)
      .attr('stroke', T.canvas)
      .attr('stroke-width', 1.5)
      .attr('cursor', 'pointer')

    // === NODE LABELS (원 안쪽) ===
    const label = g
      .append('g')
      .selectAll<SVGTextElement, GraphNode>('text')
      .data(nodes)
      .join('text')
      .attr('font-size', (d) => nodeFontSize(radius(d)))
      .attr('font-weight', 600)
      .attr('fill', (d) => NODE_TEXT_COLORS[d.type])
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('pointer-events', 'none')
      // 실제 렌더 폭을 재서 원 안에 들어갈 만큼만 남긴다 (전체 이름은 툴팁·상세 패널에서)
      .each(function (d) {
        fitLabel(this, d.label, labelMaxWidth(radius(d)))
      })

    // ===== 하이라이트 =====
    // 노드 강조·간선 강조·해제가 전부 이 한 경로를 지난다.
    function paint(spec: HighlightSpec | null) {
      if (!spec) {
        node.attr('opacity', 1).attr('stroke', T.canvas).attr('stroke-width', 1.5)
        link.attr('stroke', T.hairline).attr('stroke-opacity', 0.85).attr('stroke-width', edgeWidth)
        label.attr('opacity', 0.85)
        linkLabel.attr('visibility', 'hidden')
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
        .attr('stroke', (l) => (isLinkOn(l) ? EDGE_HIGHLIGHT : T.hairlineSoft))
        .attr('stroke-opacity', (l) => (isLinkOn(l) ? spec.linkOnOpacity : spec.linkOffOpacity))
        .attr('stroke-width', (l) =>
          isLinkOn(l) ? edgeWidth(l) + spec.linkWidthBump : edgeWidth(l) * 0.5,
        )
      label.attr('opacity', (d) => (isRelevant(d.id) ? 1 : 0.08))
      linkLabel.attr('visibility', (l) => (isLinkOn(l) ? 'visible' : 'hidden'))
    }

    /** 노드 강조 — 대상 + 이웃을 남기고 나머지를 흐린다 */
    function nodesSpec(ids: string[]): HighlightSpec {
      const focus = new Set(ids)
      const neighbors = new Set<string>()
      focus.forEach((id) => adjacency.get(id)?.forEach((n) => neighbors.add(n)))
      return {
        focus,
        neighbors,
        isLinkOn: (l) => focus.has(endId(l.source)) || focus.has(endId(l.target)),
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
      paint(h == null ? null : h.kind === 'link' ? linkSpec(h.id) : nodesSpec(h.ids))

    d3StateRef.current = { nodes, applyHighlight }
    // 필터 변경 등으로 그래프를 다시 그렸을 때도 현재 선택 강조를 유지한다
    applyHighlight(highlightRef.current)

    // ===== node interactions =====
    node
      .on('mouseover', (event: MouseEvent, d) => {
        if (!highlightRef.current) applyHighlight({ kind: 'nodes', ids: [d.id] })
        showTooltip(tooltip, event, d.label, ENTITY_LABELS[d.type], NODE_COLORS[d.type] || T.muted)
      })
      .on('mousemove', (event: MouseEvent) => moveTooltip(tooltip, event))
      .on('mouseout', () => {
        applyHighlight(highlightRef.current)
        hideTooltip(tooltip)
      })
      .on('click', (event: MouseEvent, d) => {
        event.stopPropagation()
        onNodeClick(d)
      })

    // ===== edge interactions =====
    linkHit
      .on('mouseover', (event: MouseEvent, d) => {
        if (!highlightRef.current) applyHighlight({ kind: 'link', id: d.id })
        showTooltip(
          tooltip,
          event,
          `${endId(d.source).replace(/^n:/, '')} → ${endId(d.target).replace(/^n:/, '')}`,
          (PREDICATE_LABELS[d.type] || d.type) + (d.item ? ` · ${d.item.text}` : ''),
          EDGE_HIGHLIGHT,
        )
      })
      .on('mousemove', (event: MouseEvent) => moveTooltip(tooltip, event))
      .on('mouseout', () => {
        applyHighlight(highlightRef.current)
        hideTooltip(tooltip)
      })
      .on('click', (event: MouseEvent, d) => {
        event.stopPropagation()
        onLinkClick(d)
      })

    svg.on('click', (event: MouseEvent) => {
      if (event.target === svgRef.current) onBackgroundClick()
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
          .attr('x', (d) => (seg(d).x1 + seg(d).x2) / 2)
          .attr('y', (d) => (seg(d).y1 + seg(d).y2) / 2)
        node.attr('cx', (d) => d.x!).attr('cy', (d) => d.y!)
        label.attr('x', (d) => d.x!).attr('y', (d) => d.y!)

        // 레이아웃이 잦아들면 그래프 전체가 보이도록 카메라를 한 번 맞춘다.
        // 사용자가 이미 확대/이동했거나 특정 요소를 선택한 상태면 건드리지 않는다.
        if (fitted || simulation.alpha() > 0.05) return
        fitted = true
        if (userMovedRef.current || highlightRef.current) return
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
  }, [data, sized, sizeRef, getFilteredData, onNodeClick, onLinkClick, onBackgroundClick])

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

    if (!highlight) {
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

/**
 * 원 안에 들어갈 만큼만 라벨을 남기고 나머지는 말줄임한다.
 * 한글·영문·숫자의 글자 폭이 달라 글자 수로는 맞출 수 없어 실제 렌더 폭으로 줄인다.
 */
function fitLabel(el: SVGTextElement, label: string, maxWidth: number) {
  el.textContent = label
  if (el.getComputedTextLength() <= maxWidth) return

  let text = label
  while (text.length > 1) {
    text = text.slice(0, -1)
    el.textContent = `${text}…`
    if (el.getComputedTextLength() <= maxWidth) return
  }
  // 한 글자에 말줄임표까지도 안 들어가면 첫 글자만
  el.textContent = label.slice(0, 1)
}

/** 간선 id로 양 끝 노드 id를 찾는다 */
function linkEnds(data: GraphData, linkId: string): [string, string] | null {
  const link = data.links.find((l) => l.id === linkId)
  return link ? [endId(link.source), endId(link.target)] : null
}
