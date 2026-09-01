import { ArrowRight, Quote, RotateCw } from 'lucide-react'
import { PREDICATE_LABELS, type GraphLink, type GraphNode } from '@/data/graphTypes'
import { EntityPill, Section, TypeBadge } from '@/components/graph/DetailParts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useKgRelationship } from '@/lib/queries/useKgRelationship'
import { T } from '@/lib/graphTheme'

interface Props {
  link: GraphLink
  source: GraphNode
  target: GraphNode
}

function toDate(iso: string): string {
  return iso.slice(0, 10)
}

export function EdgeDetail({ link, source, target }: Props) {
  const { data, loading, error, refetch } = useKgRelationship(link.id)

  return (
    <>
      <div className="mb-4">
        <TypeBadge color={T.primary}>관계 · {PREDICATE_LABELS[link.type]}</TypeBadge>
      </div>

      {/* subject → object */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <EntityPill node={source} />
        <ArrowRight className="size-4 text-muted-foreground" strokeWidth={2} />
        <EntityPill node={target} />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Badge variant="secondary">
          언급 <span className="font-mono font-semibold">{link.mentioned_count}</span>회
        </Badge>
      </div>

      {loading && (
        <Section title="근거 문장">
          <div className="space-y-2">
            <div className="h-4 animate-pulse rounded bg-muted" />
            <div className="h-4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </Section>
      )}

      {!loading && error && (
        <Section title="근거 문장">
          <div className="flex items-center gap-2">
            <span className="text-caption text-muted-foreground">근거를 불러오지 못했습니다</span>
            {error.isRetryable && (
              <Button variant="ghost" size="sm" onClick={refetch}>
                <RotateCw data-icon="inline-start" />
                다시 시도
              </Button>
            )}
          </div>
        </Section>
      )}

      {!loading && !error && data && (
        <>
          {data.source_sentences.length > 0 && (
            <Section title="근거 문장">
              <div className="space-y-2">
                {data.source_sentences.map((sentence, i) => (
                  <div key={i} className="flex gap-2 rounded-xl bg-surface-inset p-3">
                    <Quote
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground/70"
                      strokeWidth={2}
                    />
                    <div className="min-w-0">
                      <p className="m-0 text-body leading-relaxed text-foreground">{sentence}</p>
                      {data.mentioned_ats[i] && (
                        <div className="mt-1 font-mono text-caption text-muted-foreground">
                          {toDate(data.mentioned_ats[i])}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {(data.first_mentioned_at || data.last_mentioned_at) && (
            <div className="mt-2 font-mono text-caption text-muted-foreground">
              {data.first_mentioned_at && <>첫 언급 {toDate(data.first_mentioned_at)}</>}
              {data.first_mentioned_at && data.last_mentioned_at && ' · '}
              {data.last_mentioned_at && <>마지막 언급 {toDate(data.last_mentioned_at)}</>}
            </div>
          )}
        </>
      )}
    </>
  )
}
