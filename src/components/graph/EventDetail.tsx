import { Share2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { type GraphNode, type NodeQuote } from '@/data/graphTypes'
import { eventInfo, eventPeriod } from '@/lib/graphEvent'
import { formatShortDateTime } from '@/lib/format'
import { useNewsBriefs } from '@/lib/queries/useNewsBriefs'
import {
  ChangeText,
  LEDGER_ROW,
  Ledger,
  NameMark,
  NodeMark,
  RowAction,
  RowSkeleton,
  Section,
} from '@/components/graph/DetailParts'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MAX_KEYWORDS = 8
const MAX_COMPANIES = 8

interface Props {
  node: GraphNode
  /** 그래프에 있는 기업을 이름으로 찾는다 — 이벤트의 companies는 문자열이라 이름으로만 맞춘다 */
  nodesByLabel: Map<string, GraphNode>
  onNodeSelect?: (node: GraphNode) => void
  /** 이벤트 렌즈 hop 2로 — 이 이벤트를 공유하는 다른 기업을 본다. 이미 그 안이면 넘어오지 않는다 */
  onShowSharing?: () => void
  /** 기사를 모달로 — 뉴스 id 체계가 다르면 넘어오지 않는다 */
  onOpenNews?: (newsId: string) => void
}

/**
 * 이벤트(뉴스 클러스터) 상세. 이벤트는 기사 묶음이므로 본문은 기사 목록이다 — 어떻게 보도됐는지를 시간순으로 읽는다.
 * 기업 패널과 달리 재중심 버튼이 없다 — 이벤트를 중심으로 조회하는 엔드포인트가 없다.
 * 대신 [이 이벤트를 공유하는 기업]이 파급 탐색의 입구다.
 */
export function EventDetail({
  node,
  nodesByLabel,
  onNodeSelect,
  onShowSharing,
  onOpenNews,
}: Props) {
  const info = eventInfo(node)
  const period = eventPeriod(info.firstPublishedAt, info.lastPublishedAt)
  const keywords = info.keywords.slice(0, MAX_KEYWORDS)

  const newsIds = info.representativeNewsId != null ? [String(info.representativeNewsId)] : []
  const { briefs, loading } = useNewsBriefs(newsIds)
  // 불러오지 못한 기사(미분석 뉴스는 상세가 404다)는 빠진다 — 남은 것은 전부 모달로 열 수 있다
  const articles = newsIds
    .flatMap((id) => briefs.get(id) ?? [])
    .sort((a, b) => (a.publishedAt ?? '').localeCompare(b.publishedAt ?? ''))
  const articlesPending = loading && articles.length < newsIds.length
  const missing = newsIds.length - articles.length
  const representativeId =
    info.representativeNewsId != null ? String(info.representativeNewsId) : null

  // 그래프에 있는 기업이 먼저 — 눌러서 이어 갈 수 있는 쪽이 위다
  const companies = ([] as { name: string; ticker: string | null; quote?: NodeQuote }[])
    .map((c) => ({ ...c, hit: nodesByLabel.get(c.name) }))
    .sort((a, b) => Number(Boolean(b.hit)) - Number(Boolean(a.hit)))

  return (
    <>
      {(info.memberCount != null || period) && (
        <div className="mb-1.5 flex flex-wrap items-center gap-x-2 font-mono text-caption text-muted-foreground">
          {info.memberCount != null && <span>뉴스 {info.memberCount}건</span>}
          {period && <span>{period}</span>}
        </div>
      )}
      <h2 className="mt-0 mb-4 text-xl leading-[1.3] font-semibold tracking-[-0.4px] text-foreground">
        {node.label}
      </h2>

      {onShowSharing && (
        <div className="mb-5">
          <Button size="sm" className="w-full" onClick={onShowSharing}>
            <Share2 data-icon="inline-start" />
            이 이벤트를 공유하는 기업
          </Button>
        </div>
      )}

      {newsIds.length > 0 && (
        <Section title="이벤트 타임라인">
          {articlesPending ? (
            <RowSkeleton rows={Math.min(3, newsIds.length)} />
          ) : (
            articles.length > 0 && (
              // 왼쪽 세로선이 시간축이다 — 위에서 아래로 보도가 이어진다
              <ol className="m-0 ml-1 list-none border-l border-border-strong p-0 pl-3.5">
                {articles.map((a) => (
                  <li key={a.id} className="py-1.5">
                    <div className="font-mono text-caption text-muted-foreground">
                      {formatShortDateTime(a.publishedAt)}
                      {a.id === representativeId && (
                        <span className="ml-1.5 font-sans font-semibold text-foreground">대표 기사</span>
                      )}
                    </div>
                    {onOpenNews ? (
                      <button
                        type="button"
                        onClick={() => onOpenNews(a.id)}
                        className="mt-0.5 block w-full cursor-pointer text-left text-body leading-snug text-foreground hover:underline"
                      >
                        {a.title}
                      </button>
                    ) : a.url ? (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 block text-body leading-snug text-foreground hover:underline"
                      >
                        {a.title}
                      </a>
                    ) : (
                      <p className="m-0 mt-0.5 text-body leading-snug text-foreground">{a.title}</p>
                    )}
                  </li>
                ))}
              </ol>
            )
          )}
          {/* 관계 분석을 거치지 않은 기사는 상세 조회가 404다 — 섹션을 말없이 지우지 않고 빠진 건수를 알린다 */}
          {!articlesPending && missing > 0 && (
            <p className={cn('mb-0 text-caption text-muted-foreground', articles.length > 0 ? 'mt-2' : 'mt-0')}>
              {articles.length > 0
                ? `나머지 ${missing}건은 아직 분석되지 않아 제목을 불러오지 못했습니다.`
                : `기사 ${missing}건이 아직 분석되지 않아 제목을 불러오지 못했습니다.`}
            </p>
          )}
        </Section>
      )}

      {companies.length > 0 && (
        <Section title={`언급 기업 ${companies.length}`} meta="오늘 등락">
          <Ledger items={companies} keyOf={(c) => c.name} max={MAX_COMPANIES}>
            {({ name, ticker, hit, quote }) => (
              <li className={cn(LEDGER_ROW, 'flex items-center gap-2.5', !hit && !ticker && 'hover:bg-transparent')}>
                {hit ? <NodeMark node={hit} /> : <NameMark name={name} ticker={ticker ?? undefined} />}
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-body',
                    hit ? 'font-semibold text-foreground' : 'text-foreground-secondary',
                  )}
                >
                  {name}
                </span>
                <ChangeText value={quote?.change} className="shrink-0 text-caption" />
                {hit && onNodeSelect ? (
                  <RowAction label={`${name} 선택`} onClick={() => onNodeSelect(hit)} />
                ) : (
                  ticker && (
                    <Link
                      to={`/stock/${ticker}`}
                      aria-label={`${name} 종목 상세`}
                      className="absolute inset-0 rounded-md"
                    />
                  )
                )}
              </li>
            )}
          </Ledger>
        </Section>
      )}

      {keywords.length > 0 && (
        <p className="m-0 text-caption leading-relaxed text-muted-foreground">
          키워드 {keywords.join(', ')}
        </p>
      )}
    </>
  )
}
