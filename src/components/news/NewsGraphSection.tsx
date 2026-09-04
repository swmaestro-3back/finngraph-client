import { useCallback, useMemo, useRef, useState } from 'react'
import {
  GraphCanvas,
  type GraphCanvasRef,
  type GraphHighlight,
} from '@/components/graph/GraphCanvas'
import { HopSelector, type Hop } from '@/components/graph/HopSelector'
import { Legend } from '@/components/graph/Legend'
import { Toolbar } from '@/components/graph/Toolbar'
import { NewsRelationList } from '@/components/news/NewsRelationList'
import {
  ALL_CATEGORIES,
  ALL_PREDICATES,
  type GraphData,
  type GraphLink,
  type GraphNode,
} from '@/data/graphTypes'
import type { NewsRelation } from '@/data/graphNews'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

// 모달에서는 필터 UI가 없어 항상 전체를 보여준다 (GraphCanvas가 참조 동일성으로 재렌더를 판단한다)
const ALL_CATEGORY_SET = new Set(ALL_CATEGORIES)
const ALL_PREDICATE_SET = new Set(ALL_PREDICATES)

/** 그래프 높이 — 스크롤 컨테이너 안에서는 auto가 0으로 측정되므로 고정값이 필요하다 */
const GRAPH_HEIGHT = 420

interface Props {
  /** 현재 홉만큼 펼쳐진 그래프 */
  graph: GraphData
  /** 기사에 직접 등장한 관계 */
  relations: NewsRelation[]
  /** 홉 확장으로 딸려온 관계 — 본문에 이름이 없는 기업이 왜 걸렸는지 */
  expanded: NewsRelation[]
  /** 기사에 등장한 엔티티 id — 펼친 뒤에도 기사에서 온 것을 진하게 남긴다 */
  seedIds: string[]
  /** 기사를 원점으로 센 홉 — 1홉이 기사에 나온 엔티티다 */
  hop: Hop
  onHopChange: (hop: Hop) => void
  /** 헤더 엔티티 칩에서 호버 중인 노드 — 외부에서 들어오는 강조 */
  hoveredNodeId: string | null
}

type Selection = { kind: 'link' | 'node'; id: string }

/** 기사 속 관계 — 좌측 그래프 캔버스와 우측 관계 목록이 서로를 강조한다 */
export function NewsGraphSection({
  graph,
  relations,
  expanded,
  seedIds,
  hop,
  onHopChange,
  hoveredNodeId,
}: Props) {
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
    if (target) {
      return target.kind === 'link'
        ? { kind: 'link', id: target.id }
        : { kind: 'nodes', ids: [target.id], hops: 1 }
    }
    // 고른 게 없을 때 — 펼친 상태라면 기사에서 온 엔티티·관계를 진하게 남겨 맥락을 지킨다.
    // 카메라는 넘기지 않는다 (배경 강조라 화면을 가져가면 안 된다).
    if (hop === 1) return null
    return { kind: 'nodes', ids: seedIds, hops: 0, camera: false }
  }, [hoveredLinkId, hoveredNodeId, selected, hop, seedIds])

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

  const handleSelectLink = useCallback(
    (id: string) =>
      setSelected((prev) => (prev?.kind === 'link' && prev.id === id ? null : { kind: 'link', id })),
    [],
  )

  if (relations.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-border bg-surface-inset text-body text-muted-foreground"
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
          selectedCategories={ALL_CATEGORY_SET}
          selectedPredicates={ALL_PREDICATE_SET}
        />
        <Legend visibleCategories={ALL_CATEGORY_SET} />
        <div className={cn('absolute top-4 z-10', isMobile ? 'right-4' : 'right-16')}>
          <HopSelector value={hop} onChange={onHopChange} />
        </div>
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

      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-0.5 md:h-[420px]">
        <NewsRelationList
          title={`기사에서 추출 ${relations.length}건`}
          relations={relations}
          activeId={activeLinkId}
          onHover={setHoveredLinkId}
          onSelect={handleSelectLink}
        />
        {expanded.length > 0 && (
          <NewsRelationList
            title={`관계망 확장 ${expanded.length}건`}
            hint="기사 본문에 이름이 없는 관계"
            relations={expanded}
            activeId={activeLinkId}
            onHover={setHoveredLinkId}
            onSelect={handleSelectLink}
          />
        )}
      </div>
    </div>
  )
}
