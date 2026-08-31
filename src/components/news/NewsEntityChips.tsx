import type { NewsEntity } from '@/data/graphNews'
import { EntityChip } from '@/components/graph/DetailParts'

interface Props {
  entities: NewsEntity[]
  /** 호버 중인 엔티티의 노드 id (없으면 null) — 그래프 강조와 이어진다 */
  onHover: (nodeId: string | null) => void
}

/** 기사에 등장한 엔티티 줄 — 헤더의 색이 아래 그래프의 노드 색과 같다 */
export function NewsEntityChips({ entities, onHover }: Props) {
  if (entities.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {entities.map((entity) => (
        <span
          key={entity.label}
          onMouseEnter={() => entity.nodeId && onHover(entity.nodeId)}
          onMouseLeave={() => onHover(null)}
        >
          <EntityChip label={entity.label} type={entity.type} />
        </span>
      ))}
    </div>
  )
}
