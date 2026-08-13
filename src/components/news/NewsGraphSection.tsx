import { useCallback, useMemo, useRef, useState } from 'react'
import {
  GraphCanvas,
  type GraphCanvasRef,
  type GraphHighlight,
} from '@/components/graph/GraphCanvas'
import { Legend } from '@/components/graph/Legend'
import { Toolbar } from '@/components/graph/Toolbar'
import { NewsRelationList } from '@/components/news/NewsRelationList'
import {
  ALL_ENTITY_TYPES,
  ALL_PREDICATES,
  type GraphData,
  type GraphLink,
  type GraphNode,
} from '@/data/graphTypes'
import type { NewsRelation } from '@/data/newsDetail'
import { useIsMobile } from '@/hooks/use-mobile'

// 모달에서는 필터 UI가 없어 항상 전체를 보여준다 (GraphCanvas가 참조 동일성으로 재렌더를 판단한다)
const ALL_TYPES = new Set(ALL_ENTITY_TYPES)
const ALL_PREDICATE_SET = new Set(ALL_PREDICATES)

/** 그래프 높이 — 스크롤 컨테이너 안에서는 auto가 0으로 측정되므로 고정값이 필요하다 */
const GRAPH_HEIGHT = 420

interface Props {
  graph: GraphData
  /** 기사에 직접 등장한 관계 */
  relations: NewsRelation[]
  /** 헤더 엔티티 칩에서 호버 중인 노드 — 외부에서 들어오는 강조 */
  hoveredNodeId: string | null
}

type Selection = { kind: 'link' | 'node'; id: string }

/** 기사 속 관계 — 좌측 그래프 캔버스와 우측 관계 목록이 서로를 강조한다 */
export function NewsGraphSection({ graph, relations, hoveredNodeId }: Props) {
  const isMobile = useIsMobile()
  const canvasRef = useRef<GraphCanvasRef>(null)
  const [selected, setSelected] = useState<Selection | null>(null)
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null)

  const highlight = useMemo<GraphHighlight | null>(() => {
    const target: Selection | null = hoveredLinkId
      ? { kind: 'link', id: hoveredLinkId }
      : hoveredNodeId
        ? { kind: 'node', id: hoveredNodeId }
        : selected
    if (!target) return null
    return target.kind === 'link'
      ? { kind: 'link', id: target.id }
      : { kind: 'nodes', ids: [target.id], hops: 1 }
  }, [hoveredLinkId, hoveredNodeId, selected])

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

  const activeLinkId =
    hoveredLinkId ?? (selected?.kind === 'link' ? selected.id : null)

  if (relations.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-border bg-surface-inset text-[13px] text-muted-foreground"
        style={{ height: GRAPH_HEIGHT }}
      >
        이 기사에서 추출된 관계가 없습니다.
      </div>
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-[7fr_3fr]">
      <div
        className="relative overflow-hidden rounded-2xl border border-border"
        style={{ height: GRAPH_HEIGHT }}
      >
        <GraphCanvas
          ref={canvasRef}
          data={graph}
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
          onBackgroundClick={clearSelection}
          highlight={highlight}
          selectedTypes={ALL_TYPES}
          selectedPredicates={ALL_PREDICATE_SET}
        />
        <Legend visibleTypes={ALL_TYPES} />
        <Toolbar
          onZoomIn={() => canvasRef.current?.zoomIn()}
          onZoomOut={() => canvasRef.current?.zoomOut()}
          onReset={() => {
            canvasRef.current?.resetZoom()
            setSelected(null)
          }}
          isMobile={isMobile}
        />
      </div>

      <div className="flex min-h-0 flex-col md:h-[420px]">
        <div className="mb-1.5 text-[11px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
          추출된 관계 {relations.length}건
        </div>
        <NewsRelationList
          relations={relations}
          activeId={activeLinkId}
          onHover={setHoveredLinkId}
          onSelect={(id) =>
            setSelected((prev) =>
              prev?.kind === 'link' && prev.id === id ? null : { kind: 'link', id },
            )
          }
        />
      </div>
    </div>
  )
}
