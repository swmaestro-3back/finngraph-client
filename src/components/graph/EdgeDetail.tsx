import { ArrowRight } from 'lucide-react'
import { PREDICATE_LABELS, type GraphLink, type GraphNode } from '@/data/graphTypes'
import { EntityPill, Section, TypeBadge } from '@/components/graph/DetailParts'
import { buildEvidenceRows, type EvidenceKind } from '@/lib/edgeEvidence'
import { Badge } from '@/components/ui/badge'
import { T } from '@/lib/graphTheme'
import { cn } from '@/lib/utils'

interface Props {
  link: GraphLink
  source: GraphNode
  target: GraphNode
  /** 양 끝 기업 칩을 누르면 그 노드로 선택을 옮긴다 — 거기서 재중심으로 이어진다 */
  onNodeSelect?: (node: GraphNode) => void
  /** 근거 뉴스 id를 누르면 상세 모달로 — KG 근거 뉴스는 전부 삼중항 추출분이라 미분석 케이스가 없다 */
  onOpenNews?: (newsId: string) => void
}

const DART_VIEWER = 'https://dart.fss.or.kr/dsaf001/main.do?rcpNo='

const KIND_LABEL: Record<EvidenceKind, string> = { news: '뉴스', disclosure: '공시' }

function toDate(iso: string): string {
  return iso.slice(0, 10)
}

/** 출처 표시 — 문서에 찍는 도장처럼 각지게. 뉴스는 프라이머리 톤, 공시는 잉크 톤 */
function SourceBadge({ kind }: { kind: EvidenceKind }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-[18px] shrink-0 rounded-sm px-1.5 text-micro font-semibold tracking-[0.2px]',
        kind === 'news' ? 'border-primary/15 bg-primary/5 text-primary/70' : 'text-muted-foreground',
      )}
    >
      {KIND_LABEL[kind]}
    </Badge>
  )
}

/**
 * 간선 상세. 근거(뉴스·공시)는 kg-api가 관계에 인라인으로 실어 보내므로 링크에서 바로 읽는다.
 * 엔티티는 캔버스의 노드처럼 둥근 알약, 근거는 종이 문서처럼 각진 목록 — 반경이 곧 종류 구분이다.
 * 테마 소속 관계는 분류 근거 문장만 갖는다. 이벤트 간선(HAS_EVENT)은 선택되지 않으므로 여기 오지 않는다.
 */
export function EdgeDetail({ link, source, target, onNodeSelect, onOpenNews }: Props) {
  const rows = buildEvidenceRows(link)
  const newsCount = link.news_mention_count ?? link.news?.length ?? 0
  const disclosureCount = link.disclosure_count ?? link.disclosures?.length ?? 0
  // 0건인 종류는 말하지 않는다 — "공시 0건"은 없는 것을 알리는 노이즈다
  const countMeta = [
    newsCount > 0 && `뉴스 ${newsCount}건`,
    disclosureCount > 0 && `공시 ${disclosureCount}건`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <div className="mb-4">
        <TypeBadge color={T.primary}>관계 · {PREDICATE_LABELS[link.type]}</TypeBadge>
      </div>

      {/* subject → object */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <EntityPill node={source} onClick={onNodeSelect && (() => onNodeSelect(source))} />
        <ArrowRight className="size-4 text-muted-foreground" strokeWidth={2} />
        <EntityPill node={target} onClick={onNodeSelect && (() => onNodeSelect(target))} />
      </div>

      {link.reason && (
        <Section title="분류 근거">
          <p className="m-0 text-body leading-relaxed text-foreground">{link.reason}</p>
        </Section>
      )}

      {rows.length > 0 && (
        <Section title="관련 뉴스·공시" meta={countMeta || undefined}>
          <ul className="m-0 list-none divide-y divide-border rounded-md border border-border p-0">
            {rows.map((row) => {
              const title = (
                <>
                  {row.text}
                  {/* 반복 횟수는 이 관계의 무게다 — 시세 상승과 같은 빨강으로 눈에 띄게 */}
                  {row.count > 1 && (
                    <span className="ml-1.5 inline-block rounded-sm bg-stock-up-soft px-1 py-px font-mono text-caption font-semibold text-stock-up">
                      ×{row.count}
                    </span>
                  )}
                </>
              )
              const primaryId = row.ids[0]
              const titleClass = 'm-0 block text-body leading-snug text-foreground hover:underline'
              return (
                <li key={`${row.kind}:${row.text}`} className="flex items-start gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    {/* 제목이 곧 링크다 — 공시는 DART 원문, 뉴스는 상세 모달 */}
                    {primaryId && row.kind === 'disclosure' ? (
                      <a
                        href={`${DART_VIEWER}${primaryId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={titleClass}
                      >
                        {title}
                      </a>
                    ) : primaryId && onOpenNews ? (
                      <button
                        type="button"
                        onClick={() => onOpenNews(primaryId)}
                        className={`${titleClass} w-full text-left`}
                      >
                        {title}
                      </button>
                    ) : (
                      <p className="m-0 text-body leading-snug text-foreground">{title}</p>
                    )}
                    {row.ids.length > 0 && (
                      <div className="mt-0.5 font-mono text-caption text-muted-foreground">
                        {row.ids.join(', ')}
                      </div>
                    )}
                  </div>
                  <SourceBadge kind={row.kind} />
                </li>
              )
            })}
          </ul>
        </Section>
      )}

      {(link.first_mentioned_at || link.last_mentioned_at) && (
        <div className="mt-2 font-mono text-caption text-muted-foreground">
          {link.first_mentioned_at && <>최초 언급 {toDate(link.first_mentioned_at)}</>}
          {link.first_mentioned_at && link.last_mentioned_at && ' · '}
          {link.last_mentioned_at && <>최근 언급 {toDate(link.last_mentioned_at)}</>}
        </div>
      )}
    </>
  )
}
