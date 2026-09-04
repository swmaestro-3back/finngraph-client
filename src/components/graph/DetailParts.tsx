import type { ReactNode } from 'react'
import { nodeColor, type GraphNode } from '@/data/graphTypes'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/** 상세 패널의 소제목 + 본문 묶음. meta는 소제목 오른쪽 끝에 붙는 부가 정보 */
export function Section({
  title,
  meta,
  children,
}: {
  title: string
  meta?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <h4 className="text-caption font-semibold tracking-[0.4px] text-muted-foreground">
          {title}
        </h4>
        {meta && <span className="text-caption text-muted-foreground">{meta}</span>}
      </div>
      {children}
    </div>
  )
}

/** 엔티티 종류 색을 채운 배지 (색이 데이터라 style로 넣는다) */
export function TypeBadge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <Badge className="rounded-full px-2.5 tracking-[0.2px]" style={{ background: color }}>
      {children}
    </Badge>
  )
}

/** 칩 하나. color를 주면 앞에 분류 색 점이 붙고, onClick이 있으면 버튼으로 동작한다 */
export function EntityChip({
  label,
  color,
  size = 'sm',
  onClick,
}: {
  label: string
  /** 노드 분류 색 (nodeColor). 없으면 점 없이 라벨만 */
  color?: string
  size?: 'sm' | 'md'
  onClick?: () => void
}) {
  const content = (
    <>
      {color && (
        <span
          className={cn(size === 'md' ? 'size-2' : 'size-1.5', 'shrink-0 rounded-full')}
          style={{ background: color }}
        />
      )}
      <span className="truncate">{label}</span>
    </>
  )
  const className = cn(
    'h-auto max-w-full gap-1.5 rounded-full',
    size === 'md' ? 'px-3 py-[5px] text-body font-semibold text-foreground' : 'px-2.5 py-1 text-caption',
    onClick && 'cursor-pointer hover:bg-surface-inset',
  )

  if (!onClick) {
    return (
      <Badge variant="outline" className={className}>
        {content}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" asChild className={className}>
      <button type="button" onClick={onClick}>
        {content}
      </button>
    </Badge>
  )
}

/** 노드 라벨 + 분류 점 (간선 상세의 주어/목적어 표기용). onClick이 있으면 그 노드로 선택을 옮긴다 */
export function EntityPill({ node, onClick }: { node: GraphNode; onClick?: () => void }) {
  return <EntityChip label={node.label} color={nodeColor(node)} size="md" onClick={onClick} />
}
