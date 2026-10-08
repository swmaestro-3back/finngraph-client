import { Share2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { type GraphNode } from '@/data/graphTypes'
import {
  eventArticles,
  eventArticlesNote,
  eventInfo,
  eventPeriod,
  findCompanyNode,
  type CompanyIndex,
} from '@/lib/graphEvent'
import { formatShortDateTime } from '@/lib/format'
import { toNodeQuote } from '@/lib/kgMappers'
import { awaiting } from '@/lib/queries/useApi'
import { useEventDetail } from '@/lib/queries/useEventDetail'
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
  /** 언급 기업을 그래프 노드로 잇는다 — 티커로, 티커가 없으면 이름으로 */
  companies: CompanyIndex
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
  companies: companyIndex,
  onNodeSelect,
  onShowSharing,
  onOpenNews,
}: Props) {
  const info = eventInfo(node)
  const detail = useEventDetail(node.data.clusterId)
  const period = eventPeriod(info.firstPublishedAt, info.lastPublishedAt)
  const keywords = (detail.data?.keywords ?? info.keywords).slice(0, MAX_KEYWORDS)
  const newsCount = detail.data?.news_total ?? info.newsCount

  const articles = detail.data ? eventArticles(detail.data) : []
  const articlesPending = awaiting(detail, node.data.clusterId != null)
  // 서버는 관계 분석을 거친 기사만 준다 — 빠진 건수는 섹션을 지우지 않고 말로 알린다
  const articlesNote = detail.data ? eventArticlesNote(articles.length, detail.data.news_total) : null
  const representativeId =
    info.representativeNewsId != null ? String(info.representativeNewsId) : null

  // 그래프에 있는 기업이 먼저 — 눌러서 이어 갈 수 있는 쪽이 위다
  const companies = (detail.data?.companies ?? [])
    .map((c) => ({
      name: c.name,
      ticker: c.ticker,
      hit: findCompanyNode(companyIndex, c),
      quote: toNodeQuote(c.quote),
    }))
    .sort((a, b) => Number(Boolean(b.hit)) - Number(Boolean(a.hit)))

  return (
    <>
      {(newsCount != null || period) && (
        <div className="mb-1.5 flex flex-wrap items-center gap-x-2 font-mono text-caption text-muted-foreground">
          {newsCount != null && <span>뉴스 {newsCount}건</span>}
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

      {(articlesPending || articles.length > 0 || articlesNote || detail.error) && (
        <Section title="이벤트 타임라인">
          {articlesPending ? (
            <RowSkeleton rows={3} />
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
          {!articlesPending && detail.error && (
            <p className="m-0 text-caption text-muted-foreground">기사를 불러오지 못했습니다.</p>
          )}
          {articlesNote && (
            <p className={cn('mb-0 text-caption text-muted-foreground', articles.length > 0 ? 'mt-2' : 'mt-0')}>
              {articlesNote}
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
