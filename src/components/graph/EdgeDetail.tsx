import { ArrowRight } from 'lucide-react'
import { PREDICATE_LABELS, type GraphLink, type GraphNode } from '@/data/graphTypes'
import { EntityPill, Section, TypeBadge } from '@/components/graph/DetailParts'
import { Badge } from '@/components/ui/badge'
import { T } from '@/lib/graphTheme'
import { cn } from '@/lib/utils'

interface Props {
  link: GraphLink
  source: GraphNode
  target: GraphNode
  /** 양 끝 기업 칩을 누르면 그 노드로 선택을 옮긴다 — 거기서 재중심으로 이어진다 */
  onNodeSelect?: (node: GraphNode) => void
}

type EvidenceKind = 'news' | 'disclosure'

/** 근거 한 행 — 같은 품목 텍스트는 한 행으로 합치고 횟수만 센다 */
interface EvidenceRow {
  kind: EvidenceKind
  text: string
  count: number
  /** 공시 접수번호들 (뉴스는 비어 있다) */
  ids: string[]
}

const KIND_LABEL: Record<EvidenceKind, string> = { news: '뉴스', disclosure: '공시' }

function toDate(iso: string): string {
  return iso.slice(0, 10)
}

/**
 * 뉴스·공시 근거를 한 목록으로 합친다. 개별 근거에는 날짜가 없어 뉴스 먼저, 공시 나중 순서다.
 * 같은 품목이 여러 기사에 나오면 행 하나에 ×N으로 접는다 — "부품" 카드가 두 장 나란히 서는 것을 막는다.
 */
function buildRows(link: GraphLink): EvidenceRow[] {
  const rows = new Map<string, EvidenceRow>()
  const add = (kind: EvidenceKind, text: string, id?: string) => {
    const key = `${kind}:${text}`
    const row = rows.get(key)
    if (row) {
      row.count += 1
      if (id) row.ids.push(id)
      return
    }
    rows.set(key, { kind, text, count: 1, ids: id ? [id] : [] })
  }
  link.news?.forEach((n) => add('news', n.item ?? '품목 정보 없음'))
  link.disclosures?.forEach((d) => add('disclosure', d.item ?? '공시 항목 정보 없음', d.rcept_no))
  return [...rows.values()]
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
export function EdgeDetail({ link, source, target, onNodeSelect }: Props) {
  const rows = buildRows(link)
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
        <Section title="근거" meta={countMeta || undefined}>
          <ul className="m-0 list-none divide-y divide-border rounded-md border border-border p-0">
            {rows.map((row) => (
              <li key={`${row.kind}:${row.text}`} className="flex items-start gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-body leading-snug text-foreground">
                    {row.text}
                    {row.count > 1 && (
                      <span className="ml-1.5 font-mono text-caption text-muted-foreground">
                        ×{row.count}
                      </span>
                    )}
                  </p>
                  {row.ids.length > 0 && (
                    <div className="mt-0.5 font-mono text-caption text-muted-foreground">
                      {row.ids.join(', ')}
                    </div>
                  )}
                </div>
                <SourceBadge kind={row.kind} />
              </li>
            ))}
          </ul>
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
