import type { ReactNode } from 'react'
import { ArrowRight, FileText, Newspaper } from 'lucide-react'
import { PREDICATE_LABELS, type GraphLink, type GraphNode } from '@/data/graphTypes'
import { EntityPill, Section, TypeBadge } from '@/components/graph/DetailParts'
import { Badge } from '@/components/ui/badge'
import { T } from '@/lib/graphTheme'

interface Props {
  link: GraphLink
  source: GraphNode
  target: GraphNode
  /** 양 끝 기업 칩을 누르면 그 노드로 선택을 옮긴다 — 거기서 재중심으로 이어진다 */
  onNodeSelect?: (node: GraphNode) => void
}

function toDate(iso: string): string {
  return iso.slice(0, 10)
}

/** 근거 한 건 — 본문과 그 아래 식별자(공시 접수번호 등) */
function EvidenceCard({ icon, text, meta }: { icon: ReactNode; text: string; meta?: string }) {
  return (
    <div className="flex gap-2 rounded-xl bg-surface-inset p-3">
      {icon}
      <div className="min-w-0">
        <p className="m-0 text-body leading-relaxed text-foreground">{text}</p>
        {meta && <div className="mt-1 font-mono text-caption text-muted-foreground">{meta}</div>}
      </div>
    </div>
  )
}

const EVIDENCE_ICON = 'mt-0.5 size-4 shrink-0 text-muted-foreground/70'

/**
 * 간선 상세. 근거(뉴스·공시)는 kg-api가 관계에 인라인으로 실어 보내므로 링크에서 바로 읽는다.
 * 공급 관계는 뉴스와 공시를 따로 세고, 테마 소속 관계는 분류 근거 문장만 갖는다.
 */
export function EdgeDetail({ link, source, target, onNodeSelect }: Props) {
  const news = link.news ?? []
  const disclosures = link.disclosures ?? []
  // 공급망 관계는 뉴스/공시 건수를 따로 갖는다. 그 필드가 없으면 예전 단일 언급 횟수로 물러난다.
  const hasSplitCounts = link.news_mention_count != null || link.disclosure_count != null
  const showMentionCount = !hasSplitCounts && link.type !== 'BELONGS_TO'

  return (
    <>
      <div className="mb-4">
        <TypeBadge color={T.primary}>관계 · {PREDICATE_LABELS[link.type]}</TypeBadge>
      </div>

      {/* subject → object */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <EntityPill node={source} onClick={onNodeSelect && (() => onNodeSelect(source))} />
        <ArrowRight className="size-4 text-muted-foreground" strokeWidth={2} />
        <EntityPill node={target} onClick={onNodeSelect && (() => onNodeSelect(target))} />
      </div>

      {(hasSplitCounts || showMentionCount) && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {hasSplitCounts ? (
            <>
              <Badge variant="secondary">
                뉴스{' '}
                <span className="font-mono font-semibold">{link.news_mention_count ?? 0}</span>건
              </Badge>
              <Badge variant="secondary">
                공시 <span className="font-mono font-semibold">{link.disclosure_count ?? 0}</span>건
              </Badge>
            </>
          ) : (
            <Badge variant="secondary">
              언급 <span className="font-mono font-semibold">{link.mentioned_count}</span>회
            </Badge>
          )}
        </div>
      )}

      {link.reason && (
        <Section title="분류 근거">
          <p className="m-0 text-body leading-relaxed text-foreground">{link.reason}</p>
        </Section>
      )}

      {news.length > 0 && (
        <Section title={`근거 뉴스 (${news.length})`}>
          <div className="space-y-2">
            {news.map((n, i) => (
              <EvidenceCard
                key={`${n.news_id}-${i}`}
                icon={<Newspaper className={EVIDENCE_ICON} strokeWidth={2} />}
                text={n.item ?? '품목 정보 없음'}
              />
            ))}
          </div>
        </Section>
      )}

      {disclosures.length > 0 && (
        <Section title={`근거 공시 (${disclosures.length})`}>
          <div className="space-y-2">
            {disclosures.map((d, i) => (
              <EvidenceCard
                key={`${d.rcept_no}-${i}`}
                icon={<FileText className={EVIDENCE_ICON} strokeWidth={2} />}
                text={d.item ?? '공시 항목 정보 없음'}
                meta={d.rcept_no}
              />
            ))}
          </div>
        </Section>
      )}

      {(link.first_mentioned_at || link.last_mentioned_at) && (
        <div className="mt-2 font-mono text-caption text-muted-foreground">
          {link.first_mentioned_at && <>첫 언급 {toDate(link.first_mentioned_at)}</>}
          {link.first_mentioned_at && link.last_mentioned_at && ' · '}
          {link.last_mentioned_at && <>마지막 언급 {toDate(link.last_mentioned_at)}</>}
        </div>
      )}
    </>
  )
}
