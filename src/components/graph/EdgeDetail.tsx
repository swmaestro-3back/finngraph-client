import { ArrowRight, Quote } from 'lucide-react'
import { PREDICATE_LABELS, type GraphLink, type GraphNode } from '@/data/graphTypes'
import { EntityChip, EntityPill, Section, TypeBadge } from '@/components/graph/DetailParts'
import { Badge } from '@/components/ui/badge'
import { T } from '@/lib/graphTheme'

interface Props {
  link: GraphLink
  source: GraphNode
  target: GraphNode
}

/** 간선(관계) 상세 — 삼중항, 근거 문장, 뉴스 출처 */
export function EdgeDetail({ link, source, target }: Props) {
  const tenseLabel = link.tense === 'future_or_planned' ? '전망·계획' : '사실'

  return (
    <>
      <div className="mb-4">
        <TypeBadge color={T.primary}>관계 · {PREDICATE_LABELS[link.type]}</TypeBadge>
      </div>

      {/* subject → object */}
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <EntityPill node={source} />
        <ArrowRight className="size-4 text-muted-foreground" strokeWidth={2} />
        <EntityPill node={target} />
      </div>

      {/* 삼중항 중간 항목 */}
      {link.item && (
        <div className="mb-4 flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">대상</span>
          <EntityChip label={link.item.text} type={link.item.type} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Badge variant="secondary">{tenseLabel}</Badge>
        {link.is_negated && <Badge variant="destructive">부정</Badge>}
        <Badge variant="secondary">
          언급 <span className="font-mono font-semibold">{link.mentioned_count}</span>회
        </Badge>
      </div>

      {link.source_sentence && (
        <Section title="근거 문장">
          <div className="flex gap-2 rounded-xl bg-surface-inset p-3">
            <Quote className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" strokeWidth={2} />
            <p className="m-0 text-body leading-relaxed text-foreground">{link.source_sentence}</p>
          </div>
        </Section>
      )}

      {(link.news_title || link.news_id) && (
        <Section title="출처 뉴스">
          <div className="rounded-xl border border-border px-3 py-2.5">
            {link.news_title && (
              <div className="text-body leading-snug font-semibold text-foreground">
                {link.news_title}
              </div>
            )}
            <div className="mt-1 flex gap-2.5 font-mono text-caption text-muted-foreground">
              {link.news_id && <span>{link.news_id}</span>}
              {link.timestamp && <span>{link.timestamp}</span>}
            </div>
          </div>
        </Section>
      )}
    </>
  )
}
