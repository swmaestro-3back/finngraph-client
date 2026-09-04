import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { CircleAlert, RotateCw } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { GraphCanvas, type GraphCanvasRef, type GraphHighlight } from '@/components/graph/GraphCanvas'
import { SearchBar } from '@/components/graph/SearchBar'
import { FilterPanel } from '@/components/graph/FilterPanel'
import { DetailPanel } from '@/components/graph/DetailPanel'
import { Legend } from '@/components/graph/Legend'
import type { NodeNeighbors } from '@/components/graph/NodeDetail'
import { ScopeSelector } from '@/components/graph/ScopeSelector'
import { Toolbar } from '@/components/graph/Toolbar'
import { HopSelector } from '@/components/graph/HopSelector'
import { Button } from '@/components/ui/button'
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
  ALL_CATEGORIES,
  ALL_PREDICATES,
  nodeCategory,
  type GraphFocus,
  type GraphLink,
  type GraphNode,
  type GraphSelection,
  type NodeCategory,
  type Predicate,
} from '@/data/graphTypes'
import { SCOPE_LABELS, graphPath, scopeToKgOptions, useGraphQuery } from '@/lib/graphRoute'
import { useKgGraph } from '@/lib/queries/useKgGraph'
import { useStocks } from '@/lib/queries/useStocks'
import { useThemes } from '@/lib/queries/useThemes'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

interface Props {
  /** 그래프의 원점 — 기업(공급망) 또는 테마(소속 기업) */
  focus: GraphFocus
}

const NO_NEIGHBORS: NodeNeighbors = { incoming: [], outgoing: [] }

/** 재중심 이동에 실어 보내는 navigation state — 도착한 화면이 중심 노드를 자동 선택하라는 요청 */
interface GraphNavState {
  selectCenter?: boolean
}

/** 지식그래프 통합 뷰 — 검색/필터 사이드바 + 그래프 캔버스 + 상세 패널 */
export function GraphView({ focus }: Props) {
  const isTheme = focus.kind === 'theme'
  const focusKey = focus.kind === 'theme' ? focus.name : focus.ticker
  const noun = isTheme ? '테마' : '종목'
  // hop·범위는 URL 쿼리가 원본이다 — 새로고침·공유가 유지되고 재중심 이력이 뒤로가기로 이어진다
  const [query, updateQuery] = useGraphQuery()
  const { hop, scope } = query
  const { data, loading, error, refetch } = useKgGraph(focus, hop, scopeToKgOptions(scope))
  const { data: stocks } = useStocks()
  const { data: themes } = useThemes()
  const navigate = useNavigate()
  const location = useLocation()
  const navState = location.state as GraphNavState | null
  const isMobile = useIsMobile()
  const graphRef = useRef<GraphCanvasRef>(null)

  // 선택이 유일한 출처 — 캔버스 하이라이트도 여기서 파생된다
  const [selection, setSelection] = useState<GraphSelection | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<Set<NodeCategory>>(
    new Set(ALL_CATEGORIES),
  )
  const [selectedPredicates, setSelectedPredicates] = useState<Set<Predicate>>(
    new Set(ALL_PREDICATES),
  )

  // 종류까지 함께 본다 — 티커와 테마 이름이 우연히 같아도 원점이 바뀌면 선택을 비운다
  useEffect(() => {
    setSelection(null)
  }, [focus.kind, focusKey])

  const nodeById = useMemo(() => {
    const map = new Map<string, GraphNode>()
    data?.nodes.forEach((n) => map.set(n.id, n))
    return map
  }, [data])

  const centerId = data?.metadata.centerId ?? null

  /**
   * 재중심 직후 도착한 새 그래프에서 중심 노드를 자동 선택한다 — 패널이 새 중심의 정보로 이어진다.
   * 검색·초기 진입은 사용자가 고른 노드가 없으니 열지 않고, 모바일은 바텀시트가 튀어나오므로 하지 않는다.
   * 요청은 navigation state로 받는다 — 경로가 바뀌면 이 컴포넌트가 다시 마운트되어 ref로는 넘길 수 없다.
   */
  const selectCenterOnLoad = useRef(Boolean(navState?.selectCenter))
  useEffect(() => {
    if (!selectCenterOnLoad.current || (!data && !error)) return
    // 한 번만 소비하고 히스토리 항목의 state도 지운다 — 새로고침·뒤로가기로 이 항목에 돌아왔을 때 되살아나지 않도록
    selectCenterOnLoad.current = false
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null })
    // isMobile은 마운트 직후 effect에서 정해지므로 데이터가 도착한 이 시점엔 확정돼 있다
    if (error || isMobile || !data) return
    const center = data.metadata.centerId ? nodeById.get(data.metadata.centerId) : undefined
    if (center) setSelection({ kind: 'node', node: center })
  }, [data, error, isMobile, nodeById, navigate, location.pathname, location.search])

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

  /** 노드를 새 중심으로 — 경로가 바뀌므로 히스토리에 한 단계 쌓인다 (뒤로가기 = 이전 중심). hop·범위는 그대로 */
  const recenter = useCallback(
    (node: GraphNode) => {
      if (node.id === centerId) return
      const next: GraphFocus | null =
        node.type === 'theme'
          ? { kind: 'theme', name: node.label }
          : node.data.ticker
            ? { kind: 'company', ticker: node.data.ticker }
            : null
      if (!next) return
      const state: GraphNavState = { selectCenter: true }
      navigate(graphPath(next, query), { state })
    },
    [centerId, navigate, query],
  )

  // 필터 카운트
  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<NodeCategory, number>> = {}
    data?.nodes.forEach((n) => {
      const c = nodeCategory(n)
      counts[c] = (counts[c] ?? 0) + 1
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

  // 선택 노드의 이웃 — 간선 방향을 살려 공급처/납품처로 나눌 수 있게 한다
  const neighbors = useMemo<NodeNeighbors>(() => {
    if (!data || selection?.kind !== 'node') return NO_NEIGHBORS
    const id = selection.node.id
    const incoming = new Map<string, GraphNode>()
    const outgoing = new Map<string, GraphNode>()
    data.links.forEach((l) => {
      const s = endId(l.source)
      const t = endId(l.target)
      if (t === id) {
        const n = nodeById.get(s)
        if (n) incoming.set(s, n)
      }
      if (s === id) {
        const n = nodeById.get(t)
        if (n) outgoing.set(t, n)
      }
    })
    return { incoming: [...incoming.values()], outgoing: [...outgoing.values()] }
  }, [data, selection, nodeById])

  // 검색용으로 이미 받아 둔 종목 목록에서 선택 기업의 시세 행을 찾는다 — 추가 호출 없음
  const stockByTicker = useMemo(
    () => new Map((stocks ?? []).map((s) => [s.ticker, s])),
    [stocks],
  )
  const selectedStock =
    selection?.kind === 'node' && selection.node.data.ticker
      ? stockByTicker.get(selection.node.data.ticker)
      : undefined
  const isSelectedCenter = selection?.kind === 'node' && selection.node.id === centerId

  const handleReset = () => {
    graphRef.current?.resetZoom()
    clearSelection()
    setSelectedCategories(new Set(ALL_CATEGORIES))
    setSelectedPredicates(new Set(ALL_PREDICATES))
    updateQuery({ hop: 1, scope: 'all' })
  }

  if (loading && !data) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="w-72 space-y-3">
          <div className="h-5 animate-pulse rounded bg-muted" />
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
          <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-background text-center">
        <CircleAlert className="size-8 text-muted-foreground" />
        <h1 className="text-lg font-medium text-foreground">
          {error.isNotFound ? `존재하지 않는 ${noun}입니다` : '일시적인 오류'}
        </h1>
        <p className="text-body text-muted-foreground">
          {error.isNotFound
            ? `"${focusKey}" ${noun}의 그래프를 찾을 수 없습니다.`
            : error.isRetryable
              ? '일시적으로 그래프를 불러올 수 없습니다.'
              : '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
        </p>
        {error.isNotFound ? (
          <Button variant="outline" size="sm" asChild>
            <Link to={isTheme ? '/themes' : '/stocks'}>{noun} 목록으로</Link>
          </Button>
        ) : (
          error.isRetryable && (
            <Button variant="outline" size="sm" onClick={refetch}>
              <RotateCw data-icon="inline-start" />
              다시 시도
            </Button>
          )
        )}
      </div>
    )
  }

  if (!data) return null

  const scoped = !isTheme && scope !== 'all'

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
          <SearchBar
            stocks={stocks ?? []}
            themes={themes ?? []}
            onSelect={(next) => navigate(graphPath(next, query))}
          />
        </SidebarHeader>
        <SidebarContent className="px-3 pb-4">
          <FilterPanel
            selectedCategories={selectedCategories}
            onCategoriesChange={setSelectedCategories}
            selectedPredicates={selectedPredicates}
            onPredicatesChange={setSelectedPredicates}
            categoryCounts={categoryCounts}
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
                {scoped && ` · 범위 ${SCOPE_LABELS[scope]}`}
              </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-background">
        <div className="flex size-full">
          {/* @container — 상단 컨트롤이 뷰포트가 아니라 캔버스 폭(사이드바·상세 패널을 뺀 나머지)에 맞춰 접히도록 */}
          <div className="@container relative min-w-0 flex-1 overflow-hidden">
            <SidebarTrigger
              className="absolute top-3 left-3 z-20 size-9 rounded-lg border border-border bg-background/90 text-foreground shadow-sm backdrop-blur hover:bg-accent"
              aria-label="사이드바 열기/닫기"
            />
            {data.links.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <p className="text-body font-medium text-foreground">
                  {isTheme
                    ? '이 테마에 속한 기업이 없습니다'
                    : scoped
                      ? `${SCOPE_LABELS[scope]} 범위에 연결된 관계가 없습니다`
                      : '연결된 관계가 없습니다'}
                </p>
                <p className="text-caption text-muted-foreground">
                  {isTheme
                    ? '다른 테마나 종목을 검색해 보세요.'
                    : scoped
                      ? '범위를 전체로 넓히거나 홉을 늘려 보세요.'
                      : '다른 종목을 검색하거나 홉을 넓혀 보세요.'}
                </p>
                {scoped && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => updateQuery({ scope: 'all' })}
                  >
                    범위를 전체로
                  </Button>
                )}
              </div>
            ) : (
              <GraphCanvas
                ref={graphRef}
                data={data}
                onNodeClick={selectNode}
                onNodeDoubleClick={recenter}
                onLinkClick={selectLink}
                onBackgroundClick={clearSelection}
                highlight={highlight}
                centerId={centerId}
                selectedCategories={selectedCategories}
                selectedPredicates={selectedPredicates}
              />
            )}
            <Legend visibleCategories={selectedCategories} />
            {/* 테마 조회는 서버가 홉·범위를 받지 않는다 — 테마 + 소속 기업으로 고정 */}
            {!isTheme && (
              <div
                className={cn(
                  'absolute top-4 z-10 flex items-center gap-2',
                  // 데스크톱에서는 우상단 툴바(확대·축소·초기화) 왼쪽에 붙이고, 좁으면 Hop이 아래 줄로 내려간다
                  isMobile ? 'right-4' : 'right-16 max-w-[calc(100%-7.5rem)] flex-wrap justify-end',
                )}
              >
                {/* 캔버스가 42rem보다 좁으면 6칸 세그먼트가 사이드바 토글을 덮으므로 아이콘+시트로 접는다 */}
                <div className="@2xl:hidden">
                  <ScopeSelector value={scope} onChange={(next) => updateQuery({ scope: next })} compact />
                </div>
                <div className="hidden @2xl:block">
                  <ScopeSelector value={scope} onChange={(next) => updateQuery({ scope: next })} />
                </div>
                <HopSelector value={hop} onChange={(next) => updateQuery({ hop: next })} />
              </div>
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
              neighbors={neighbors}
              isCenter={isSelectedCenter}
              stock={selectedStock}
              onNodeSelect={selectNode}
              onRecenter={recenter}
            />
          )}
        </div>
      </SidebarInset>

      {selection && isMobile && (
        <DetailPanel
          selection={selection}
          onClose={clearSelection}
          isMobile
          neighbors={neighbors}
          isCenter={isSelectedCenter}
          stock={selectedStock}
          onNodeSelect={selectNode}
          onRecenter={recenter}
        />
      )}
    </SidebarProvider>
  )
}
