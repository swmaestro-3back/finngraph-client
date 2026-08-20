import { useState, useCallback, useMemo, useRef } from 'react'
import { useGraphData } from '@/lib/useGraphData'
import { GraphCanvas, type GraphCanvasRef, type GraphHighlight } from '@/components/graph/GraphCanvas'
import { SearchBar } from '@/components/graph/SearchBar'
import { FilterPanel } from '@/components/graph/FilterPanel'
import { DetailPanel } from '@/components/graph/DetailPanel'
import { Legend } from '@/components/graph/Legend'
import { Toolbar } from '@/components/graph/Toolbar'
import { HopSelector, type Hop } from '@/components/graph/HopSelector'
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  endId,
  ALL_ENTITY_TYPES,
  ALL_PREDICATES,
  type EntityType,
  type GraphLink,
  type GraphNode,
  type GraphSelection,
  type Predicate,
} from '@/data/graphTypes'
import { useIsMobile } from '@/hooks/use-mobile'

/** 기업 지식그래프 통합 뷰 — 검색/필터 사이드바 + 그래프 캔버스 + 상세 패널 */
export function GraphView() {
  const { data, loading, error } = useGraphData()
  const isMobile = useIsMobile()
  const graphRef = useRef<GraphCanvasRef>(null)

  // 선택이 유일한 출처 — 캔버스 하이라이트도 여기서 파생된다
  const [selection, setSelection] = useState<GraphSelection | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<Set<EntityType>>(new Set(ALL_ENTITY_TYPES))
  const [selectedPredicates, setSelectedPredicates] = useState<Set<Predicate>>(
    new Set(ALL_PREDICATES),
  )
  /** 노드 선택 시 몇 홉까지 펼쳐 볼지 — 선택을 바꿔도 사용자가 고른 깊이는 유지한다 */
  const [hop, setHop] = useState<Hop>(1)

  const nodeById = useMemo(() => {
    const map = new Map<string, GraphNode>()
    data?.nodes.forEach((n) => map.set(n.id, n))
    return map
  }, [data])

  const highlight = useMemo<GraphHighlight | null>(() => {
    if (!selection) return null
    return selection.kind === 'node'
      ? { kind: 'nodes', ids: [selection.node.id], hops: hop }
      : { kind: 'link', id: selection.link.id }
  }, [selection, hop])

  const selectNode = useCallback((node: GraphNode) => setSelection({ kind: 'node', node }), [])

  const selectLink = useCallback(
    (link: GraphLink) => {
      const source = nodeById.get(endId(link.source))
      const target = nodeById.get(endId(link.target))
      if (!source || !target) return
      setSelection({ kind: 'edge', link, source, target })
    },
    [nodeById],
  )

  const clearSelection = useCallback(() => setSelection(null), [])

  const handleSearchSelect = useCallback(
    (nodeId: string) => {
      const node = nodeById.get(nodeId)
      if (node) selectNode(node)
    },
    [nodeById, selectNode],
  )

  // 필터 카운트
  const typeCounts = useMemo(() => {
    const counts: Partial<Record<EntityType, number>> = {}
    data?.nodes.forEach((n) => {
      counts[n.type] = (counts[n.type] ?? 0) + 1
    })
    return counts
  }, [data])

  const predicateCounts = useMemo(() => {
    const counts: Partial<Record<Predicate, number>> = {}
    data?.links.forEach((l) => {
      counts[l.type] = (counts[l.type] ?? 0) + 1
    })
    return counts
  }, [data])

  // 선택 노드의 연결 엔티티
  const connectedNodes = useMemo(() => {
    if (!data || selection?.kind !== 'node') return []
    const id = selection.node.id
    const neighborIds = new Set<string>()
    data.links.forEach((l) => {
      const s = endId(l.source)
      const t = endId(l.target)
      if (s === id) neighborIds.add(t)
      if (t === id) neighborIds.add(s)
    })
    return data.nodes.filter((n) => neighborIds.has(n.id))
  }, [data, selection])

  const handleReset = () => {
    graphRef.current?.resetZoom()
    clearSelection()
    setSelectedTypes(new Set(ALL_ENTITY_TYPES))
    setSelectedPredicates(new Set(ALL_PREDICATES))
    setHop(1)
  }

  if (loading) {
    return <CenteredMessage>데이터를 불러오는 중...</CenteredMessage>
  }
  if (error) {
    return <CenteredMessage tone="error">{error}</CenteredMessage>
  }
  if (!data) return null

  return (
    <SidebarProvider
      className="h-full min-h-0"
      style={{ '--sidebar-width': '17rem', '--sidebar-width-icon': '3rem' } as React.CSSProperties}
    >
      <Sidebar
        collapsible="offcanvas"
        // shadcn Sidebar는 뷰포트 고정(fixed/h-svh)이라, 헤더~푸터 사이 섹션(relative)에
        // 담기도록 absolute/h-full로 덮어쓴다 (tailwind-merge가 fixed·h-svh를 제거).
        className="absolute h-full"
      >
        <SidebarHeader className="p-4 pb-3">
          <SearchBar onSelectResult={handleSearchSelect} nodes={data.nodes} />
        </SidebarHeader>
        <SidebarContent className="px-3 pb-4">
          <FilterPanel
            selectedTypes={selectedTypes}
            onTypesChange={setSelectedTypes}
            selectedPredicates={selectedPredicates}
            onPredicatesChange={setSelectedPredicates}
            typeCounts={typeCounts}
            predicateCounts={predicateCounts}
          />
        </SidebarContent>
        <SidebarFooter className="p-4 pt-3">
          <div className="mt-6 rounded-xl border border-border bg-surface-inset p-3">
            <div className="mb-1 text-caption font-semibold tracking-[0.5px] text-muted-foreground">
              통계
            </div>
            <div className="text-body font-medium text-foreground">
              노드 <span className="font-mono">{data.metadata.stats.total_nodes}</span> · 관계{' '}
              <span className="font-mono">{data.metadata.stats.total_edges}</span>
            </div>
            {data.metadata.center && (
              <div className="mt-1 text-caption text-muted-foreground">
                중심: {data.metadata.center}
              </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-background">
        <div className="flex size-full">
          <div className="relative min-w-0 flex-1 overflow-hidden">
            <SidebarTrigger
              className="absolute top-3 left-3 z-20 size-9 rounded-lg border border-border bg-background/90 text-foreground shadow-sm backdrop-blur hover:bg-accent"
              aria-label="사이드바 열기/닫기"
            />
            <GraphCanvas
              ref={graphRef}
              data={data}
              onNodeClick={selectNode}
              onLinkClick={selectLink}
              onBackgroundClick={clearSelection}
              highlight={highlight}
              selectedTypes={selectedTypes}
              selectedPredicates={selectedPredicates}
            />
            <Legend visibleTypes={selectedTypes} />
            {selection?.kind === 'node' && (
              <HopSelector value={hop} onChange={setHop} isMobile={isMobile} />
            )}
            <Toolbar
              onZoomIn={() => graphRef.current?.zoomIn()}
              onZoomOut={() => graphRef.current?.zoomOut()}
              onReset={handleReset}
              isMobile={isMobile}
            />
          </div>
          {selection && !isMobile && (
            <DetailPanel
              selection={selection}
              onClose={clearSelection}
              connectedNodes={connectedNodes}
              onNodeSelect={selectNode}
            />
          )}
        </div>
      </SidebarInset>

      {selection && isMobile && (
        <DetailPanel
          selection={selection}
          onClose={clearSelection}
          isMobile
          connectedNodes={connectedNodes}
          onNodeSelect={selectNode}
        />
      )}
    </SidebarProvider>
  )
}

function CenteredMessage({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode
  tone?: 'muted' | 'error'
}) {
  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className={tone === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
        {children}
      </div>
    </div>
  )
}
