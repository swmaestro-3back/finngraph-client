import type { ReactNode } from 'react'
import { NODE_COLORS, type EntityType, type GraphNode } from '@/data/graphTypes'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/** 상세 패널의 소제목 + 본문 묶음 */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="mb-1.5 text-[11px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
        {title}
      </h4>
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

/** 칩 하나. type을 주면 앞에 종류 색 점이 붙고, onClick이 있으면 버튼으로 동작한다 */
export function EntityChip({
  label,
  type,
  size = 'sm',
  onClick,
}: {
  label: string
  /** 없으면 점 없이 라벨만 (별칭 등) */
  type?: EntityType
  size?: 'sm' | 'md'
  onClick?: () => void
}) {
  const content = (
    <>
      {type && (
        <span
          className={cn(size === 'md' ? 'size-2' : 'size-1.5', 'shrink-0 rounded-full')}
          style={{ background: NODE_COLORS[type] }}
        />
      )}
      <span className="truncate">{label}</span>
    </>
  )
  const className = cn(
    'h-auto max-w-full gap-1.5 rounded-full',
    size === 'md' ? 'px-3 py-[5px] text-[13px] font-semibold text-foreground' : 'px-2.5 py-1 text-[11px]',
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

/** 노드 라벨 + 종류 점 (간선 상세의 주어/목적어 표기용) */
export function EntityPill({ node }: { node: GraphNode }) {
  return <EntityChip label={node.label} type={node.type} size="md" />
}
