import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { CircleAlert, RotateCw } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  GraphCanvas,
  type GraphCanvasRef,
  type GraphHighlight,
  type GraphPreview,
} from '@/components/graph/GraphCanvas'
import { DetailPanel } from '@/components/graph/DetailPanel'
import { LegendFilter, type LegendPreview } from '@/components/graph/LegendFilter'
import { OriginBar } from '@/components/graph/OriginBar'
import { NewsDetailModal } from '@/components/news/NewsDetailModal'
import { classifyNeighbors, EMPTY_NEIGHBORS, type NodeNeighbors } from '@/lib/graphNeighbors'
import type { CenterShortcuts } from '@/components/graph/NodeDetail'
import { ScopeSelector } from '@/components/graph/ScopeSelector'
import { Toolbar } from '@/components/graph/Toolbar'
import { HopSelector } from '@/components/graph/HopSelector'
import { LensSelector } from '@/components/graph/LensSelector'
import { MemberVeil } from '@/components/gate/MemberVeil'
import { Button } from '@/components/ui/button'
import {
  endId,
  ALL_PREDICATES,
  isEventLink,
  nodeCategory,
  type GraphData,
  type GraphFocus,
  type GraphLink,
  type GraphNode,
  type GraphSelection,
  type NodeCategory,
  type Predicate,
} from '@/data/graphTypes'
import {
  SCOPE_LABELS,
  graphPath,
  lensControls,
  lensDefaultCategories,
  useGraphQuery,
} from '@/lib/graphRoute'
import { useMemberGate } from '@/lib/memberGate'
import { useKgGraph } from '@/lib/queries/useKgGraph'
import { useStocksCached } from '@/lib/queries/useStocksCached'
import { useThemesCached } from '@/lib/queries/useThemesCached'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

interface Props {
  /** 그래프의 원점 — 기업(공급망) 또는 테마(소속 기업) */
  focus: GraphFocus
}

/** 패널 안 이동 이력 상한 — 되돌아가기는 몇 걸음이면 충분하다 */
const MAX_TRAIL = 20

/** 재중심 이동에 실어 보내는 navigation state — 도착한 화면이 중심 노드를 자동 선택하라는 요청 */
interface GraphNavState {
  selectCenter?: boolean
}

/**
 * 지식그래프 통합 뷰 — 그래프 캔버스 + 상세 패널. 왼쪽 사이드바는 없다: 컨트롤은 전부 캔버스 위에 뜬다.
 * 위쪽(원점·렌즈·범위·Hop)은 무엇을 가져올지, 아래쪽(범례)은 가져온 것 중 무엇을 볼지다.
 */
export function GraphView({ focus }: Props) {
  const isTheme = focus.kind === 'theme'
  const focusKey = focus.kind === 'theme' ? focus.name : focus.ticker
  const noun = isTheme ? '테마' : '종목'
  // hop·범위는 URL 쿼리가 원본이다 — 새로고침·공유가 유지되고 재중심 이력이 뒤로가기로 이어진다
  const [query, updateQuery] = useGraphQuery()
  const { hop, scope, lens } = query
  // 테마 원점은 렌즈가 없다 — 컨트롤을 전부 숨기고 필터도 전체 켜짐으로 둔다
  const controls = isTheme ? { hop: false, scope: false } : lensControls(lens)
  const { locked, pending, promptLogin } = useMemberGate()
  const gatedHop = locked && hop > 1 ? 1 : hop
  const gatedQuery = gatedHop === hop ? query : { ...query, hop: gatedHop }
  // 개요는 서버가 1홉 고정이라 URL에 hop이 남아 있어도 강조 범위는 1홉이다
  const effectiveHop = controls.hop ? gatedHop : 1
  const { data, loading, error, refetch } = useKgGraph(focus, gatedQuery)
  // 전종목·테마 목록은 수백 KB다 — 재중심으로 이 화면이 다시 마운트될 때마다 받지 않도록 탭 공용 캐시를 탄다
  const { data: stocks } = useStocksCached()
  const { data: themes } = useThemesCached()
  const navigate = useNavigate()
  const location = useLocation()
  const navState = location.state as GraphNavState | null
  const isMobile = useIsMobile()
  const graphRef = useRef<GraphCanvasRef>(null)

  // 선택이 유일한 출처 — 캔버스 하이라이트도 여기서 파생된다
  const [selection, setSelection] = useState<GraphSelection | null>(null)
  /** 패널 안에서 행을 눌러 옮겨 온 길 — 패널 맨 위 되돌아가기가 이 순서를 거슬러 간다. 캔버스에서 새로 고르면 비운다 */
  const [trail, setTrail] = useState<GraphSelection[]>([])
  /** 패널의 이웃 행에 올린 간선 — 선택을 바꾸지 않고 캔버스에서 그 간선만 잠깐 켠다 */
  const [hoverLinkId, setHoverLinkId] = useState<string | null>(null)
  /** 범례 항목에 올린 종류 — 그 종류의 노드(또는 간선)만 잠깐 켠다 */
  const [legendPreview, setLegendPreview] = useState<LegendPreview | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<Set<NodeCategory>>(() =>
    lensDefaultCategories(lens),
  )
  const [selectedPredicates, setSelectedPredicates] = useState<Set<Predicate>>(
    new Set(ALL_PREDICATES),
  )

  // 종류까지 함께 본다 — 티커와 테마 이름이 우연히 같아도 원점이 바뀌면 선택을 비운다
  useEffect(() => {
    setSelection(null)
    setTrail([])
  }, [focus.kind, focusKey])

  // 행을 눌러 선택이 옮겨 가면 그 행은 사라져 mouseleave가 오지 않는다 — 선택이 바뀔 때마다 지운다
  useEffect(() => {
    setHoverLinkId(null)
  }, [selection])

  // 렌즈를 바꾸면 필터는 그 렌즈의 기본값으로 돌아간다 — 한 렌즈에서 끈 종류가 다른 렌즈까지 따라오지 않도록
  useEffect(() => {
    setSelectedCategories(lensDefaultCategories(lens))
    setSelectedPredicates(new Set(ALL_PREDICATES))
  }, [lens])

  const nodeById = useMemo(() => {
    const map = new Map<string, GraphNode>()
    data?.nodes.forEach((n) => map.set(n.id, n))
    return map
  }, [data])

  /**
   * 렌즈·홉·범위가 바뀌어 새 그래프가 오면 선택을 같은 id로 갈아탄다 — 패널이 새 응답의 이웃으로 갱신된다.
   * 새 그래프에 없으면 해제한다. 노드 객체가 같으면 손대지 않아 무한 갱신이 없다.
   * nodeById가 data별로 참조가 안정적인 노드 객체를 돌려준다는 데 기대는 임시 방편이고, id 기반 선택으로
   * 바꾸는 게 정식 후속 리팩터다 — 그때까지는 같은 data를 두 번 훑지 않도록 마지막으로 동기화한 data를 기억해 둔다.
   * (캔버스가 클릭 핸들러에 노드 "복사본"을 넘기므로 클릭마다 fresh !== selection.node가 항상 참이 되어,
   * data가 그대로여도 매번 재실행되며 불필요한 setSelection·카메라 재이동이 일어나는 것을 막는다.)
   */
  const syncedDataRef = useRef<GraphData | null>(null)
  useEffect(() => {
    if (syncedDataRef.current === data) return
    syncedDataRef.current = data
    // 이력은 이전 그래프의 노드·간선 객체를 쥐고 있다 — 새 그래프에서는 버린다
    setTrail((t) => (t.length > 0 ? [] : t))
    if (!data || !selection) return
    if (selection.kind === 'node') {
      const fresh = nodeById.get(selection.node.id)
      if (!fresh) setSelection(null)
      else if (fresh !== selection.node) setSelection({ kind: 'node', node: fresh })
      return
    }
    const link = data.links.find((l) => l.id === selection.link.id)
    const source = link && nodeById.get(endId(link.source))
    const target = link && nodeById.get(endId(link.target))
    if (!link || !source || !target) setSelection(null)
    else if (link !== selection.link) setSelection({ kind: 'edge', link, source, target })
  }, [data, nodeById, selection])

  // 이벤트의 언급 기업은 이름 문자열이라 이름으로 노드를 찾는다. 동명이면 먼저 온 것(중심에 가까운 쪽)이 남는다
  const nodesByLabel = useMemo(() => {
    const map = new Map<string, GraphNode>()
    data?.nodes.forEach((n) => {
      if (n.type === 'company' && !map.has(n.label)) map.set(n.label, n)
    })
    return map
  }, [data])

  const [openNewsId, setOpenNewsId] = useState<string | null>(null)

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
      ? { kind: 'nodes', ids: [selection.node.id], hops: effectiveHop }
      : { kind: 'link', id: selection.link.id }
  }, [selection, effectiveHop])

  /** 간선 → 선택. 이벤트 간선은 보여줄 상세가 없고, 끝점이 응답에 없으면 그릴 수 없다 */
  const toEdgeSelection = useCallback(
    (link: GraphLink): GraphSelection | null => {
      if (isEventLink(link)) return null
      const source = nodeById.get(endId(link.source))
      const target = nodeById.get(endId(link.target))
      return source && target ? { kind: 'edge', link, source, target } : null
    },
    [nodeById],
  )

  // 캔버스에서 고른 선택 — 새 출발이라 패널 안 이동 이력을 비운다
  const selectNode = useCallback((node: GraphNode) => {
    setTrail([])
    setSelection({ kind: 'node', node })
  }, [])

  const selectLink = useCallback(
    (link: GraphLink) => {
      // 선택할 수 없는 간선은 클릭을 무시하고 기존 선택을 그대로 둔다
      const next = toEdgeSelection(link)
      if (!next) return
      setTrail([])
      setSelection(next)
    },
    [toEdgeSelection],
  )

  /** 패널 안에서 옮겨 가는 선택 — 지금 선택을 이력에 쌓아 되돌아갈 수 있게 한다 */
  const stepTo = useCallback(
    (next: GraphSelection) => {
      if (selection) setTrail((t) => [...t, selection].slice(-MAX_TRAIL))
      setSelection(next)
    },
    [selection],
  )
  const stepToNode = useCallback((node: GraphNode) => stepTo({ kind: 'node', node }), [stepTo])
  const stepToLink = useCallback(
    (link: GraphLink) => {
      const next = toEdgeSelection(link)
      if (next) stepTo(next)
    },
    [toEdgeSelection, stepTo],
  )
  const stepBack = useCallback(() => {
    const previous = trail.at(-1)
    if (!previous) return
    setTrail(trail.slice(0, -1))
    setSelection(previous)
  }, [trail])

  const clearSelection = useCallback(() => {
    setTrail([])
    setSelection(null)
  }, [])

  /** 노드를 새 중심으로 — 경로가 바뀌므로 히스토리에 한 단계 쌓인다 (뒤로가기 = 이전 중심). hop·범위는 그대로 */
  const recenter = useCallback(
    (node: GraphNode) => {
      if (node.id === centerId) return
      // 이벤트는 중심이 될 수 없다 — 이벤트 중심 엔드포인트가 없다
      if (node.type === 'event') return
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

  /** 소속 테마 칩 → 테마 그래프. 선택 대신 이동한다 — 테마의 소속 기업은 테마 원점에서만 보인다 */
  const openTheme = useCallback(
    (node: GraphNode) => navigate(graphPath({ kind: 'theme', name: node.label }, query)),
    [navigate, query],
  )

  const eventCount = useMemo(() => data?.nodes.filter((n) => n.type === 'event').length ?? 0, [data])

  // 개요 렌즈의 중심 기업 패널에서만 — 다른 렌즈는 이미 그 축 안이다
  const centerShortcuts = useMemo<CenterShortcuts | undefined>(
    () =>
      !isTheme && lens === 'overview'
        ? {
            onOpenSupply: () => updateQuery({ lens: 'supply' }),
            // 개요는 hop을 안 쓰므로 URL에 남은 hop이 이벤트 렌즈로 새지 않게 1로 고정
            onOpenEvents: () => updateQuery({ lens: 'events', hop: 1 }),
            eventCount,
          }
        : undefined,
    [isTheme, lens, updateQuery, eventCount],
  )

  // 이벤트 렌즈 hop 2 = "같은 이벤트를 공유하는 기업". 이미 그 안(hop ≥ 2)이면 버튼을 내지 않는다.
  // 선택은 지우지 않는다 — 이벤트 id가 엔드포인트 사이에서 같아 새 응답에서도 그 노드가 선택된 채 남는다 (Task 13)
  const showSharing =
    !isTheme && (lens !== 'events' || hop < 2)
      ? () => updateQuery({ lens: 'events', hop: 2 })
      : undefined

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

  // 캔버스에 넘기는 미리 보기 — 패널 행이 범례보다 먼저다(둘이 동시에 걸릴 일은 없지만 더 좁은 쪽을 따른다)
  const preview = useMemo<GraphPreview | null>(() => {
    if (hoverLinkId) return { kind: 'link', id: hoverLinkId }
    if (!data || !legendPreview) return null
    return legendPreview.kind === 'category'
      ? {
          kind: 'nodes',
          ids: data.nodes.filter((n) => nodeCategory(n) === legendPreview.category).map((n) => n.id),
        }
      : {
          kind: 'links',
          ids: data.links.filter((l) => l.type === legendPreview.predicate).map((l) => l.id),
        }
  }, [data, hoverLinkId, legendPreview])

  // 선택 노드의 이웃 — 필터 전 전체 links로 분류해, 캔버스에서 숨긴 테마도 칩으로는 보인다
  const neighbors = useMemo<NodeNeighbors>(() => {
    if (!data || selection?.kind !== 'node') return EMPTY_NEIGHBORS
    return classifyNeighbors(selection.node.id, data.links, nodeById)
  }, [data, selection, nodeById])

  // 선택 간선과 같은 두 노드를 잇는 다른 간선 — 반대 방향 공급이나 인수·공급이 겹친 경우를 패널이 이어 준다
  const siblings = useMemo<GraphLink[]>(() => {
    if (!data || selection?.kind !== 'edge') return []
    const ends = new Set([selection.source.id, selection.target.id])
    return data.links.filter(
      (l) =>
        l.id !== selection.link.id &&
        !isEventLink(l) &&
        endId(l.source) !== endId(l.target) &&
        ends.has(endId(l.source)) &&
        ends.has(endId(l.target)),
    )
  }, [data, selection])

  // 검색용으로 이미 받아 둔 종목·테마 목록에서 패널이 시세를 찾는다 — 추가 호출 없음
  const stockByTicker = useMemo(
    () => new Map((stocks ?? []).map((s) => [s.ticker, s])),
    [stocks],
  )
  const stockByName = useMemo(() => new Map((stocks ?? []).map((s) => [s.name, s])), [stocks])
  const themeByName = useMemo(() => new Map((themes ?? []).map((t) => [t.name, t])), [themes])

  const handleReset = () => {
    graphRef.current?.resetZoom()
    clearSelection()
    setSelectedCategories(lensDefaultCategories('overview'))
    setSelectedPredicates(new Set(ALL_PREDICATES))
    updateQuery({ hop: 1, scope: 'all', lens: 'overview' })
  }

  if (loading && !data) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="w-72 space-y-3">
          <div className="h-5 animate-pulse rounded bg-muted" />
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
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

  const scoped = controls.scope && scope !== 'all'

  // 데스크톱은 캔버스 옆 칸, 모바일은 바텀시트 — 자리만 다르고 내용은 같다
  const detailPanel = selection && !locked && !pending && (
    <DetailPanel
      selection={selection}
      onClose={clearSelection}
      isMobile={isMobile}
      previous={trail.at(-1)}
      onBack={stepBack}
      neighbors={neighbors}
      centerId={centerId}
      stockByTicker={stockByTicker}
      stockByName={stockByName}
      themeByName={themeByName}
      siblings={siblings}
      onNodeSelect={stepToNode}
      onLinkSelect={stepToLink}
      onLinkHover={setHoverLinkId}
      onRecenter={recenter}
      onThemeOpen={openTheme}
      centerShortcuts={centerShortcuts}
      nodesByLabel={nodesByLabel}
      onShowSharing={showSharing}
      onOpenNews={setOpenNewsId}
    />
  )

  return (
    <>
      <div className="flex size-full bg-background">
        {/* @container — 상단 컨트롤이 뷰포트가 아니라 캔버스 폭(상세 패널을 뺀 나머지)에 맞춰 접히도록 */}
        <div className="@container relative min-w-0 flex-1 overflow-hidden">
          {/* 렌즈·홉을 바꾸는 동안 이전 그래프를 그대로 두고 상단에 얇은 진행 표시만 — 화면이 비었다 채워지는 깜빡임을 피한다 */}
          {loading && (
            <div
              role="progressbar"
              aria-label="그래프 불러오는 중"
              className="absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-primary/15"
            >
              <div className="h-full w-1/3 animate-pulse bg-primary" />
            </div>
          )}
          <div inert={locked || pending || undefined} className="absolute inset-0">
            <GraphCanvas
              ref={graphRef}
              data={data}
              onNodeClick={selectNode}
              onNodeDoubleClick={recenter}
              onLinkClick={selectLink}
              onBackgroundClick={clearSelection}
              highlight={highlight}
              preview={preview}
              centerId={centerId}
              selectedCategories={selectedCategories}
              selectedPredicates={selectedPredicates}
            />
          </div>
          {(locked || pending) && (
            <MemberVeil
              title={`${noun} 관계 그래프는 로그인하면 열려요`}
              description="공급·투자·인수 관계를 근거 뉴스와 공시까지 따라갈 수 있습니다."
              pending={pending}
              onLogin={promptLogin}
            />
          )}
          {/* 관계가 0개여도 캔버스와 중심 노드는 그대로 두고 안내만 얹는다 — 패널·범례와 화면이 어긋나지 않도록 */}
          {!locked && !pending && data.links.length === 0 && (
            <div
              // 캔버스는 중심 노드 하나를 가운데에 그리고 있다 — 그 아래 빈자리에 겹쳐 두고, 노드 클릭·드래그는 통과시킨다
              className="pointer-events-none absolute inset-x-0 top-[calc(50%+4.5rem)] z-10 flex flex-col items-center gap-2 px-4 text-center"
            >
              <p className="text-body font-medium text-foreground">
                {isTheme
                  ? '이 테마에 속한 기업이 없습니다'
                  : lens === 'events'
                    ? '아직 수집된 이벤트가 없습니다'
                    : lens === 'themes'
                      ? '이 기업이 속한 테마가 없습니다'
                      : scoped
                        ? `${SCOPE_LABELS[scope]} 범위에 연결된 관계가 없습니다`
                        : '연결된 관계가 없습니다'}
              </p>
              <p className="text-caption text-muted-foreground">
                {isTheme
                  ? '다른 테마나 종목을 검색해 보세요.'
                  : lens === 'events'
                    ? '뉴스가 쌓이면 여기에 이벤트가 나타납니다.'
                    : lens === 'themes'
                      ? '공급망에서 연결된 기업을 살펴보세요.'
                      : scoped
                        ? '범위를 전체로 넓히거나 홉을 늘려 보세요.'
                        : '다른 종목을 검색하거나 홉을 넓혀 보세요.'}
              </p>
              {(lens === 'events' || lens === 'themes') && !isTheme && (
                <Button
                  variant="outline"
                  size="sm"
                  className="pointer-events-auto mt-2"
                  onClick={() => updateQuery({ lens: 'supply' })}
                >
                  공급망 보기
                </Button>
              )}
              {scoped && (
                <Button
                  variant="outline"
                  size="sm"
                  className="pointer-events-auto mt-2"
                  onClick={() => updateQuery({ scope: 'all' })}
                >
                  범위를 전체로
                </Button>
              )}
            </div>
          )}

          {/*
            위쪽 한 줄 — 무엇을 가져올지. 원점(무엇을) → 렌즈(어느 축으로) → 범위·Hop(얼마나)의 순서로 읽히고,
            전부 서버에 다시 묻는 컨트롤이다. 좁으면 뒤쪽부터 아래 줄로 내려간다.
            데스크톱은 우상단 툴바(확대·축소·초기화) 자리를 남긴다 — 모바일은 툴바가 아래에 있다.
          */}
          <div
            className={cn(
              'absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2',
              isMobile ? 'max-w-[calc(100%-1.5rem)]' : 'max-w-[calc(100%-4.75rem)]',
            )}
          >
            <OriginBar
              center={centerId ? nodeById.get(centerId) : undefined}
              stocks={stocks ?? []}
              themes={themes ?? []}
              onSelect={(next) => navigate(graphPath(next, query))}
            />
            {!isTheme && <LensSelector value={lens} onChange={(next) => updateQuery({ lens: next })} />}
            {/*
              Hop·범위는 렌즈가 서버에 보내는 파라미터만큼만 보인다 — 개요는 둘 다 없음, 이벤트는 Hop만.
              한 묶음으로 둔다: 폭이 모자라면 Hop만 혼자 내려가지 않고 "얼마나"가 함께 둘째 줄로 간다.
            */}
            {(controls.scope || controls.hop) && (
              <div className="flex flex-wrap items-center gap-2">
                {controls.scope && (
                  <>
                    {/* 캔버스가 42rem보다 좁으면 6칸 세그먼트가 한 줄을 넘기므로 아이콘+시트로 접는다 */}
                    <div className="@2xl:hidden">
                      <ScopeSelector value={scope} onChange={(next) => updateQuery({ scope: next })} compact />
                    </div>
                    <div className="hidden @2xl:block">
                      <ScopeSelector value={scope} onChange={(next) => updateQuery({ scope: next })} />
                    </div>
                  </>
                )}
                {controls.hop && (
                  <HopSelector
                    value={gatedHop}
                    onChange={(next) => updateQuery({ hop: next })}
                    lockedFrom={locked ? 2 : undefined}
                    onLockedSelect={promptLogin}
                  />
                )}
                {/* 모바일은 폭이 없어 힌트를 숨긴다 — Hop 라벨은 남는다 */}
                {lens === 'events' && !isMobile && (
                  <p className="m-0 text-micro text-muted-foreground">
                    1 이벤트 · 2 공유 기업 · 3 그 기업들의 이벤트
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 아래쪽 — 가져온 것 중 무엇을 볼지. 화면에서만 숨기고 서버에는 묻지 않는다 */}
          <LegendFilter
            selectedCategories={selectedCategories}
            onCategoriesChange={setSelectedCategories}
            selectedPredicates={selectedPredicates}
            onPredicatesChange={setSelectedPredicates}
            categoryCounts={categoryCounts}
            predicateCounts={predicateCounts}
            onPreview={setLegendPreview}
          />
          <Toolbar
            onZoomIn={() => graphRef.current?.zoomIn()}
            onZoomOut={() => graphRef.current?.zoomOut()}
            onReset={handleReset}
            isMobile={isMobile}
          />
        </div>
        {!isMobile && detailPanel}
      </div>

      {isMobile && detailPanel}
      <NewsDetailModal newsId={openNewsId} onOpenChange={(open) => !open && setOpenNewsId(null)} />
    </>
  )
}
