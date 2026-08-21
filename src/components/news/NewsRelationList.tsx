import { useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import { PREDICATE_LABELS } from '@/data/graphTypes'
import type { NewsRelation } from '@/data/newsDetail'
import { EntityChip } from '@/components/graph/DetailParts'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Props {
  relations: NewsRelation[]
  /** 현재 강조 중인 간선 id */
  activeId: string | null
  onHover: (linkId: string | null) => void
  onSelect: (linkId: string) => void
}

/** 기사에서 추출된 트리플 목록 — 카드와 캔버스가 서로를 강조한다 */
export function NewsRelationList({ relations, activeId, onHover, onSelect }: Props) {
  const listRef = useRef<HTMLDivElement>(null)

  // 캔버스에서 간선을 고르면 목록에서도 그 카드가 보이도록 따라간다
  useEffect(() => {
    if (!activeId || !listRef.current) return
    listRef.current
      .querySelector(`[data-link-id="${CSS.escape(activeId)}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeId])

  return (
    <div ref={listRef} className="flex flex-col gap-2 overflow-y-auto pr-0.5">
      {relations.map(({ link, source, target }) => {
        const active = link.id === activeId
        return (
          <button
            key={link.id}
            type="button"
            data-link-id={link.id}
            onClick={() => onSelect(link.id)}
            onMouseEnter={() => onHover(link.id)}
            onMouseLeave={() => onHover(null)}
            className={cn(
              'rounded-xl border p-3 text-left transition-colors',
              active
                ? 'border-primary bg-surface-inset'
                : 'border-border hover:border-primary/40 hover:bg-surface-inset',
            )}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <EntityChip label={source.label} type={source.type} />
              <span className="text-caption font-semibold text-primary">
                {PREDICATE_LABELS[link.type]}
              </span>
              <ArrowRight className="size-3.5 text-muted-foreground" strokeWidth={2} />
              <EntityChip label={target.label} type={target.type} />
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {link.item && <EntityChip label={link.item.text} type={link.item.type} />}
              {link.tense === 'future_or_planned' && <Badge variant="secondary">전망·계획</Badge>}
              {link.is_negated && <Badge variant="destructive">부정</Badge>}
            </div>

            {link.source_sentence && (
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                “{link.source_sentence}”
              </p>
            )}
          </button>
        )
      })}
    </div>
  )
}
