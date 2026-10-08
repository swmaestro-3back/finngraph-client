import { useEffect, useRef } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import {
  CATEGORY_LABELS,
  PREDICATE_LABELS,
  nodeCategory,
  type GraphLink,
  type GraphNode,
  type GraphSelection,
} from '@/data/graphTypes'
import type { CompanyIndex } from '@/lib/graphEvent'
import type { NodeNeighbors } from '@/lib/graphNeighbors'
import { NodeDetail, type CenterShortcuts } from '@/components/graph/NodeDetail'
import { EdgeDetail } from '@/components/graph/EdgeDetail'
import { EventDetail } from '@/components/graph/EventDetail'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface Props {
  selection: GraphSelection
  onClose: () => void
  /** 모바일에서는 바텀시트로 띄운다 */
  isMobile?: boolean
  /** 패널 안에서 옮겨 오기 전의 선택 — 있으면 맨 위에 되돌아가기가 생긴다 */
  previous?: GraphSelection
  onBack?: () => void
  /** 선택 노드의 관계별 이웃 (노드 선택일 때) */
  neighbors: NodeNeighbors
  /** 지금 조회의 중심 노드 id */
  centerId: string | null
  /** 선택 간선과 같은 두 노드를 잇는 다른 간선 (간선 선택일 때) */
  siblings: GraphLink[]
  onNodeSelect?: (node: GraphNode) => void
  onLinkSelect?: (link: GraphLink) => void
  onLinkHover?: (linkId: string | null) => void
  onRecenter?: (node: GraphNode) => void
  onThemeOpen?: (node: GraphNode) => void
  centerShortcuts?: CenterShortcuts
  /** 이벤트 상세의 언급 기업을 그래프 노드로 잇는 색인(티커·이름) */
  companies: CompanyIndex
  onShowSharing?: () => void
  onOpenNews?: (newsId: string) => void
}

/** 선택한 노드/간선의 상세 — 데스크톱은 우측 패널, 모바일은 바텀시트 */
export function DetailPanel({
  selection,
  onClose,
  isMobile = false,
  previous,
  onBack,
  neighbors,
  centerId,
  siblings,
  onNodeSelect,
  onLinkSelect,
  onLinkHover,
  onRecenter,
  onThemeOpen,
  centerShortcuts,
  companies,
  onShowSharing,
  onOpenNews,
}: Props) {
  // 선택이 바뀌면 맨 위부터 — 앞 대상을 읽던 스크롤 위치가 새 대상의 중간을 보여주지 않게 한다
  const scrollRef = useRef<HTMLDivElement>(null)
  const selectionKey = selection.kind === 'edge' ? selection.link.id : selection.node.id
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [selectionKey])

  // key — 선택이 바뀌면 [더 보기]로 펼친 상태가 다음 대상까지 따라가지 않게 새로 그린다
  const detail =
    selection.kind === 'edge' ? (
      <EdgeDetail
        key={selection.link.id}
        link={selection.link}
        source={selection.source}
        target={selection.target}
        siblings={siblings}
        onNodeSelect={onNodeSelect}
        onLinkSelect={onLinkSelect}
        onOpenNews={onOpenNews}
      />
    ) : selection.node.type === 'event' ? (
      <EventDetail
        key={selection.node.id}
        node={selection.node}
        companies={companies}
        onNodeSelect={onNodeSelect}
        onShowSharing={onShowSharing}
        onOpenNews={onOpenNews}
      />
    ) : (
      <NodeDetail
        key={selection.node.id}
        node={selection.node}
        neighbors={neighbors}
        centerId={centerId}
        onNodeSelect={onNodeSelect}
        onLinkSelect={onLinkSelect}
        onLinkHover={onLinkHover}
        onRecenter={onRecenter}
        onThemeOpen={onThemeOpen}
        centerShortcuts={centerShortcuts}
      />
    )

  // 맨 윗줄 — 패널 안에서 옮겨 왔으면 되돌아가기, 아니면 지금 보는 것이 무엇인지. 오른쪽 닫기 버튼과 같은 줄이다
  const topLine =
    previous && onBack ? (
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 flex min-w-0 cursor-pointer items-center gap-1 rounded-md px-1 text-caption text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5 shrink-0" strokeWidth={2} />
        <span className="truncate">{selectionTitle(previous)}</span>
      </button>
    ) : (
      <span className="text-caption font-semibold tracking-[0.4px] text-muted-foreground">
        {selectionKind(selection)}
      </span>
    )

  if (isMobile) {
    return (
      <Sheet open onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl p-5">
          <SheetHeader className="sr-only">
            <SheetTitle>{selectionTitle(selection)}</SheetTitle>
          </SheetHeader>
          {/* 시트의 닫기 버튼이 오른쪽 위에 있다 — 그 자리를 비운다 */}
          <div className="mb-3 flex h-7 items-center pr-9">{topLine}</div>
          {detail}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="h-full w-90 shrink-0 overflow-y-auto border-l border-border bg-background p-5"
    >
      <div className="mb-3 flex h-7 items-center justify-between gap-2">
        {topLine}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="닫기"
          className="-mr-1.5 shrink-0 text-muted-foreground"
        >
          <X strokeWidth={2} />
        </Button>
      </div>
      {detail}
    </div>
  )
}

/** 선택을 한 줄로 — 스크린리더용 시트 제목과 되돌아가기 글자 */
function selectionTitle(selection: GraphSelection): string {
  if (selection.kind === 'node') return selection.node.label
  return `${selection.source.label} → ${selection.target.label} · ${PREDICATE_LABELS[selection.link.type]}`
}

/** 지금 보는 것의 종류 — 기업은 시장 이름이 아래 줄에 있으므로 "기업"으로 통일한다 */
function selectionKind(selection: GraphSelection): string {
  if (selection.kind === 'edge') return '관계'
  return selection.node.type === 'company' ? '기업' : CATEGORY_LABELS[nodeCategory(selection.node)]
}
