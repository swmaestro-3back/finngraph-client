import { X } from 'lucide-react'
import { PREDICATE_LABELS, type GraphNode, type GraphSelection } from '@/data/graphTypes'
import type { StockRowRes } from '@/lib/apiTypes'
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
  /** 선택 노드의 관계별 이웃 (노드 선택일 때) */
  neighbors: NodeNeighbors
  /** 선택 노드가 지금 조회의 중심인가 */
  isCenter: boolean
  /** 선택 노드의 시세 행 (기업이고 종목 목록에 있을 때) */
  stock?: StockRowRes
  onNodeSelect?: (node: GraphNode) => void
  onRecenter?: (node: GraphNode) => void
  onThemeOpen?: (node: GraphNode) => void
  centerShortcuts?: CenterShortcuts
  /** 이벤트 상세의 언급 기업 칩이 그래프 노드를 이름으로 찾을 때 */
  nodesByLabel: Map<string, GraphNode>
  onShowSharing?: () => void
  onOpenNews?: (newsId: string) => void
}

/** 선택한 노드/간선의 상세 — 데스크톱은 우측 패널, 모바일은 바텀시트 */
export function DetailPanel({
  selection,
  onClose,
  isMobile = false,
  neighbors,
  isCenter,
  stock,
  onNodeSelect,
  onRecenter,
  onThemeOpen,
  centerShortcuts,
  nodesByLabel,
  onShowSharing,
  onOpenNews,
}: Props) {
  const body =
    selection.kind === 'edge' ? (
      <EdgeDetail
        link={selection.link}
        source={selection.source}
        target={selection.target}
        onNodeSelect={onNodeSelect}
      />
    ) : selection.node.type === 'event' ? (
      <EventDetail
        node={selection.node}
        nodesByLabel={nodesByLabel}
        onNodeSelect={onNodeSelect}
        onShowSharing={onShowSharing}
        onOpenNews={onOpenNews}
      />
    ) : (
      <NodeDetail
        node={selection.node}
        neighbors={neighbors}
        isCenter={isCenter}
        stock={stock}
        onNodeSelect={onNodeSelect}
        onRecenter={onRecenter}
        onThemeOpen={onThemeOpen}
        centerShortcuts={centerShortcuts}
      />
    )

  if (isMobile) {
    return (
      <Sheet open onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl p-5">
          <SheetHeader className="sr-only">
            <SheetTitle>{selectionTitle(selection)}</SheetTitle>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div className="relative h-full w-90 shrink-0 overflow-y-auto border-l border-border bg-background p-5">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        aria-label="닫기"
        className="absolute top-4 right-4 text-muted-foreground"
      >
        <X strokeWidth={2} />
      </Button>
      {body}
    </div>
  )
}

/** 스크린리더용 시트 제목 */
function selectionTitle(selection: GraphSelection): string {
  if (selection.kind === 'node') return selection.node.label
  return `${selection.source.label} → ${selection.target.label} · ${PREDICATE_LABELS[selection.link.type]}`
}
