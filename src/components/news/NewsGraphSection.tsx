import { useCallback, useMemo, useRef, useState } from 'react'
import {
  GraphCanvas,
  type GraphCanvasRef,
  type GraphHighlight,
} from '@/components/graph/GraphCanvas'
import { HopSelector, type Hop } from '@/components/graph/HopSelector'
import { Legend } from '@/components/graph/Legend'
import { Toolbar } from '@/components/graph/Toolbar'
import {
  ALL_CATEGORIES,
  ALL_PREDICATES,
  nodeCategory,
  type GraphData,
  type GraphLink,
  type GraphNode,
  type NodeCategory,
} from '@/data/graphTypes'
import { primaryNodeIds, type NewsRelation } from '@/lib/useNewsGraph'
import { useIsMobile } from '@/hooks/use-mobile'

// 모달에는 필터 UI가 없어 캔버스는 항상 전체를 그린다 (GraphCanvas가 참조 동일성으로 재렌더를 판단한다)
const ALL_CATEGORY_SET = new Set(ALL_CATEGORIES)
const ALL_PREDICATE_SET = new Set(ALL_PREDICATES)

/**
 * 캔버스 높이 — 가로형. 1홉은 관계 한두 개라 문장처럼 옆으로 읽히고,
 * 뷰포트 기준 상한을 둬 모달 안에서 스크롤 없이 보이게 한다. 스크롤 컨테이너 안이라 auto는 0으로 측정되므로 명시한다.
 */
const GRAPH_HEIGHT = 'clamp(300px, 44vh, 460px)'

/** 홉 표시 — 기사에 나온 관계가 0홉, 그 주변이 1·2홉. 서버 hop(1~3)과는 1 차이 난다 */
const HOP_LABELS: Record<Hop, string> = { 1: '0', 2: '1', 3: '2' }

interface Props {
  /** 현재 범위만큼 펼쳐진 그래프 */
  graph: GraphData
  /** 기사에 직접 등장한 관계 — 캔버스에서 항상 켜진 간선이 된다 */
  relations: NewsRelation[]
  /** 기사에 등장한 기업 id — 펼친 뒤에도 기사에서 온 것을 크게 남긴다 */
  seedIds: string[]
  /** 기사를 원점으로 센 홉 — 1이 기사에 나온 관계만이다 */
  hop: Hop
  onHopChange: (hop: Hop) => void
  /** 모달 상단 종목 칩에서 호버 중인 노드 — 외부에서 들어오는 강조 */
  hoveredNodeId: string | null
  /** 모달 상단 종목 칩의 ticker — 시드 기업과 합쳐 메인 노드로 크게 그린다 */
  relatedTickers: string[]
  /** 서버 노드 상한에 걸려 주변 기업이 일부만 왔는가 */
  truncated: boolean
}

type Selection = { kind: 'link' | 'node'; id: string }

/** 지금 무엇을 보고 있는지 한 문장 — 제목·카운트 대신 프레임 안에서 범위와 함께 바뀐다 */
function captionOf(hop: Hop, relationCount: number, neighborCount: number, truncated: boolean): string {
  const base = `기사에서 추출한 관계 ${relationCount}건`
  if (hop === 1) return base
  const neighbors = `주변 기업 ${neighborCount}곳${truncated ? ' (일부만 표시)' : ''}`
  return `기사 관계 ${relationCount}건 + ${neighbors}`
}

/** 기사 속 관계 — 요약문 아래 이어지는 한 장면. 관계 내용은 간선 툴팁으로 본다 */
export function NewsGraphSection({
  graph,
  relations,
  seedIds,
  hop,
  onHopChange,
  hoveredNodeId,
  relatedTickers,
  truncated,
}: Props) {
  const isMobile = useIsMobile()
  const canvasRef = useRef<GraphCanvasRef>(null)
  const [selected, setSelected] = useState<Selection | null>(null)

  // GraphCanvas는 이 두 Set의 참조로 재렌더를 판단한다 — 데이터가 바뀔 때만 새로 만든다
  const primaryIds = useMemo(
    () => primaryNodeIds(graph.nodes, seedIds, relatedTickers),
    [graph.nodes, seedIds, relatedTickers],
  )
  const seedLinkIds = useMemo(() => new Set(relations.map((r) => r.link.id)), [relations])

  // 범례는 그래프에 실제로 있는 시장만 — 뉴스 그래프는 기업뿐이라 테마·이벤트는 나오지 않는다
  const presentCategories = useMemo(
    () => new Set<NodeCategory>(graph.nodes.map(nodeCategory)),
    [graph.nodes],
  )

  const highlight = useMemo<GraphHighlight | null>(() => {
    const target: Selection | null = hoveredNodeId ? { kind: 'node', id: hoveredNodeId } : selected
    if (!target) return null
    return target.kind === 'link'
      ? { kind: 'link', id: target.id }
      : { kind: 'nodes', ids: [target.id], hops: 1 }
  }, [hoveredNodeId, selected])

  // 간선 카드의 출처 꼬리표 — 기사에서 온 관계에만 붙인다. 주변 관계는 근거 건수·기간이 그 자리를 채운다
  const linkTag = useCallback(
    (link: GraphLink) => (seedLinkIds.has(link.id) ? '이 기사에서 추출' : null),
    [seedLinkIds],
  )

  // GraphCanvas의 메인 이펙트 의존성이라 참조가 바뀌면 그래프를 처음부터 다시 그린다
  const handleNodeClick = useCallback(
    (node: GraphNode) => setSelected({ kind: 'node', id: node.id }),
    [],
  )
  const handleLinkClick = useCallback(
    (link: GraphLink) => setSelected({ kind: 'link', id: link.id }),
    [],
  )
  const clearSelection = useCallback(() => setSelected(null), [])

  if (relations.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-border bg-surface-inset text-body text-muted-foreground"
        style={{ height: GRAPH_HEIGHT }}
      >
        이 기사에서 추출된 관계가 없습니다.
      </div>
    )
  }

  const neighborCount = graph.nodes.length - seedIds.length

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-border"
      style={{ height: GRAPH_HEIGHT }}
    >
      <GraphCanvas
        ref={canvasRef}
        data={graph}
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
        onBackgroundClick={clearSelection}
        highlight={highlight}
        selectedCategories={ALL_CATEGORY_SET}
        selectedPredicates={ALL_PREDICATE_SET}
        primaryIds={primaryIds}
        seedLinkIds={seedLinkIds}
        linkTag={linkTag}
      />
      {/* 좌상단 캡션이 제목 역할 — 범위를 바꾸면 문장이 따라 바뀐다 */}
      <p className="pointer-events-none absolute top-4 left-4 z-10 rounded-md bg-background/90 px-2.5 py-1 text-caption font-medium text-foreground-secondary backdrop-blur">
        {captionOf(hop, relations.length, neighborCount, truncated)}
      </p>
      <div className="absolute top-4 right-4 z-10">
        <HopSelector value={hop} onChange={onHopChange} labels={HOP_LABELS} />
      </div>
      <Legend visibleCategories={presentCategories} />
      {/* 확대·축소는 휠로 충분하다 — 초기화만 우하단에 */}
      <Toolbar
        onZoomIn={() => canvasRef.current?.zoomIn()}
        onZoomOut={() => canvasRef.current?.zoomOut()}
        onReset={() => {
          canvasRef.current?.resetZoom()
          setSelected(null)
        }}
        isMobile={isMobile}
        resetOnly
        placement="bottom"
      />
    </div>
  )
}
