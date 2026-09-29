import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MemberVeil } from '@/components/gate/MemberVeil'
import { GraphCanvas, type GraphCanvasRef, type GraphHighlight } from '@/components/graph/GraphCanvas'
import { Legend } from '@/components/graph/Legend'
import { Toolbar } from '@/components/graph/Toolbar'
import {
  ALL_CATEGORIES,
  ALL_PREDICATES,
  nodeCategory,
  type GraphLink,
  type GraphNode,
  type NodeCategory,
} from '@/data/graphTypes'
import { useIsMobile } from '@/hooks/use-mobile'
import type { BriefingLockedRes, RelationGraphRes } from '@/lib/apiTypes'
import { toRelationGraphData } from '@/lib/briefing'
import { useMemberGate } from '@/lib/memberGate'

const ALL_CATEGORY_SET = new Set(ALL_CATEGORIES)
const ALL_PREDICATE_SET = new Set(ALL_PREDICATES)
const GRAPH_HEIGHT = 'clamp(280px, 40vh, 420px)'

interface RelationGraphCardProps {
  graph: RelationGraphRes | null
  locked: BriefingLockedRes | null
  hoveredEdgeId: string | null
  onOpenNews: (newsId: string) => void
}

export function RelationGraphCard({ graph, locked, hoveredEdgeId, onOpenNews }: RelationGraphCardProps) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const gate = useMemberGate()
  const canvasRef = useRef<GraphCanvasRef>(null)
  const [selected, setSelected] = useState<GraphHighlight | null>(null)

  const data = useMemo(() => (graph ? toRelationGraphData(graph) : null), [graph])
  const seedLinkIds = useMemo(() => new Set(data?.links.map((l) => l.id) ?? []), [data])
  const presentCategories = useMemo(
    () => new Set<NodeCategory>(data?.nodes.map(nodeCategory) ?? []),
    [data],
  )
  const highlight = useMemo<GraphHighlight | null>(
    () => (hoveredEdgeId ? { kind: 'link', id: hoveredEdgeId } : selected),
    [hoveredEdgeId, selected],
  )

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (node.data.ticker) navigate(`/graph/${node.data.ticker}`)
      else setSelected({ kind: 'nodes', ids: [node.id], hops: 1 })
    },
    [navigate],
  )
  const handleLinkClick = useCallback(
    (link: GraphLink) => {
      const news = link.news?.[0]
      const disclosure = graph?.edges.find((e) => e.id === link.id)?.sources.find((s) => s.type === 'DISCLOSURE')
      if (news) onOpenNews(news.news_id)
      else if (disclosure?.url) window.open(disclosure.url, '_blank', 'noopener,noreferrer')
      else setSelected({ kind: 'link', id: link.id })
    },
    [graph, onOpenNews],
  )
  const clearSelection = useCallback(() => setSelected(null), [])

  if (locked || gate.locked || gate.pending) {
    return (
      <div className="relative overflow-hidden rounded-lg border border-border bg-graph-canvas" style={{ height: GRAPH_HEIGHT }}>
        <MemberVeil
          title="오늘의 관계 그래프는 로그인하면 열려요"
          description={`뉴스·공시에서 확인된 관계 ${locked?.graphEdges ?? 0}건을 그래프로 봅니다.`}
          pending={gate.pending}
          onLogin={gate.promptLogin}
        />
      </div>
    )
  }

  if (!data || data.links.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-border bg-surface-inset px-6 text-center text-body text-muted-foreground [text-wrap:pretty]"
        style={{ height: GRAPH_HEIGHT }}
      >
        기준일 창에서 뉴스·공시로 확인된 관계가 없습니다. 추출은 매시 정각에 돌아 최근 기사는 대기 중일 수 있습니다.
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-border" style={{ height: GRAPH_HEIGHT }}>
      <GraphCanvas
        ref={canvasRef}
        data={data}
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
        onBackgroundClick={clearSelection}
        highlight={highlight}
        selectedCategories={ALL_CATEGORY_SET}
        selectedPredicates={ALL_PREDICATE_SET}
        seedLinkIds={seedLinkIds}
      />
      <p className="pointer-events-none absolute top-4 left-4 z-10 rounded-md bg-background/90 px-2.5 py-1 text-caption font-medium text-foreground-secondary backdrop-blur">
        관계 {data.links.length}건 · 기업 {data.nodes.length}곳
      </p>
      <Legend visibleCategories={presentCategories} />
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
