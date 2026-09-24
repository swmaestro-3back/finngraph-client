import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, CircleAlert, RotateCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Hop } from '@/components/graph/HopSelector'
import { NewsGraphSection } from '@/components/news/NewsGraphSection'
import { NewsSummary } from '@/components/news/NewsSummary'
import { NewsStockChips } from '@/components/news/NewsStockChips'
import { NewsSection } from '@/components/theme/NewsSection'
import { toNewsItem } from '@/lib/apiMappers'
import { formatDateTime, pressOf } from '@/lib/format'
import { useNewsGraph } from '@/lib/useNewsGraph'
import { useNewsCompanies } from '@/lib/queries/useNewsCompanies'
import { useNewsDetail } from '@/lib/queries/useNewsDetail'
import { cn } from '@/lib/utils'

interface Props {
  newsId: string | null
  onOpenChange: (open: boolean) => void
}

export function NewsDetailModal({ newsId, onOpenChange }: Props) {
  const [currentId, setCurrentId] = useState<string | null>(newsId)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [hop, setHop] = useState<Hop>(1)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (newsId) setCurrentId(newsId)
  }, [newsId])

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
    setHoveredNodeId(null)
    setHop(1)
  }, [currentId])

  const { data: news, loading, error, refetch } = useNewsDetail(currentId)
  const { data: companies } = useNewsCompanies(currentId)
  const { data: graphData, similar } = useNewsGraph(currentId, hop)

  const relatedStocks = companies ?? []
  // 종목 칩에 올리면 아래 그래프에서 그 기업 노드를 켠다 — 칩(시세)과 그래프(관계)가 같은 기업으로 이어진다
  const nodeIdByTicker = useMemo(
    () =>
      new Map(
        (graphData?.graph.nodes ?? []).flatMap((n) => (n.data.ticker ? [[n.data.ticker, n.id] as const] : [])),
      ),
    [graphData],
  )
  const hoverStock = useCallback(
    (ticker: string | null) => setHoveredNodeId(ticker ? (nodeIdByTicker.get(ticker) ?? null) : null),
    [nodeIdByTicker],
  )
  const relatedTickers = useMemo(
    () => (companies ?? []).flatMap((s) => (s.ticker ? [s.ticker] : [])),
    [companies],
  )
  const similarItems = useMemo(() => similar.map(toNewsItem), [similar])
  /** "기업 그래프에서 보기"의 원점 — 관련 종목 중 ticker가 있는 첫 기업 */
  const graphTicker = relatedTickers[0] ?? null

  const open = newsId !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
          'flex flex-col gap-0 overflow-hidden p-0 sm:max-w-[1080px]',
          // 오버레이가 헤더까지 덮으므로 헤더 아래가 아니라 화면 위 32px에 상단 고정 — 요약과 관계 그래프가 한 화면에 들어온다
          'top-8 max-h-[calc(100vh-56px)] translate-y-0',
        )}>
        {loading && (
          <div className="px-6 pt-9 pb-10 sm:px-10 sm:pt-10 sm:pb-12">
            <DialogTitle className="sr-only">뉴스 불러오는 중</DialogTitle>
            <DialogDescription className="sr-only">뉴스를 불러오고 있습니다</DialogDescription>
            <div className="h-7 w-4/5 animate-pulse rounded bg-muted" />
            <div className="mt-2.5 h-7 w-1/2 animate-pulse rounded bg-muted" />
            <div className="mt-5 h-3.5 w-56 animate-pulse rounded bg-muted" />
            <div className="my-6 border-t border-border" />
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          </div>
        )}

        {!loading && error && (
          <div className="px-6 pt-9 pb-10 sm:px-10 sm:pt-10 sm:pb-12">
            <DialogTitle className="pr-8 text-[24px] leading-[1.35] font-bold tracking-[-0.6px]">
              {error.isNotFound ? '뉴스를 찾을 수 없습니다' : '일시적인 오류'}
            </DialogTitle>
            <DialogDescription className="sr-only">뉴스 조회 실패</DialogDescription>
            <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
              <CircleAlert className="size-8 text-muted-foreground" />
              <p className="text-body text-muted-foreground">
                {error.isNotFound
                  ? '삭제되었거나 존재하지 않는 뉴스입니다.'
                  : error.isRetryable
                    ? '일시적으로 데이터를 불러올 수 없습니다.'
                    : '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
              </p>
              {error.isRetryable ? (
                <Button variant="outline" size="sm" onClick={refetch}>
                  <RotateCw data-icon="inline-start" />
                  다시 시도
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  닫기
                </Button>
              )}
            </div>
          </div>
        )}

        {!loading && !error && news && (
          <div ref={bodyRef} className="min-h-0 overflow-y-auto px-6 pt-9 pb-10 sm:px-10 sm:pt-10 sm:pb-12">
            <article>
              <DialogTitle className="pr-8 text-[24px] leading-[1.35] font-bold tracking-[-0.6px] [text-wrap:balance]">
                {news.title}
              </DialogTitle>
              <div className="mt-4 flex items-center justify-between gap-4">
                <DialogDescription className="flex items-center gap-2.5 text-caption text-muted-foreground">
                  <span className="text-xs font-semibold text-foreground">{pressOf(news.url)}</span>
                  <span aria-hidden className="h-3 w-px bg-border" />
                  <span>입력 {formatDateTime(news.collectedAt)}</span>
                </DialogDescription>
                {news.url && (
                  <a
                    href={news.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    원문 보기
                    <ArrowUpRight className="size-3.5" />
                  </a>
                )}
              </div>

              <div className="my-6 border-t border-border" />

              {/* 두 덩어리(요약·그래프)가 같은 폭·같은 여백이라 제목이 없으면 경계가 안 읽힌다 */}
              <h3 className="mb-4 text-sm font-semibold text-foreground">기사 요약</h3>

              {relatedStocks.length > 0 && (
                <div className="mb-5">
                  <NewsStockChips
                    stocks={relatedStocks}
                    onNavigate={() => onOpenChange(false)}
                    onHover={hoverStock}
                  />
                </div>
              )}

              <NewsSummary
                summary={news.summary}
                stocks={relatedStocks}
                onNavigate={() => onOpenChange(false)}
              />
            </article>

            {graphData && graphData.graph.metadata.stats.total_nodes > 0 && (
              <section className="mt-8 border-t border-border pt-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">관계 그래프</h3>
                  {/* 종목 상세 페이지의 "지식그래프에서 보기"와 같은 버튼 — 첫 관련 종목을 중심으로 연다 */}
                  {graphTicker && (
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/graph/${graphTicker}`} onClick={() => onOpenChange(false)}>
                        기업 그래프에서 보기
                      </Link>
                    </Button>
                  )}
                </div>
                <NewsGraphSection
                  graph={graphData.graph}
                  relations={graphData.relations}
                  seedIds={graphData.seedIds}
                  hop={hop}
                  onHopChange={setHop}
                  hoveredNodeId={hoveredNodeId}
                  relatedTickers={relatedTickers}
                  truncated={graphData.truncated}
                />
              </section>
            )}

            {similarItems.length > 0 && (
              <NewsSection
                plain
                className="mt-10 border-t border-border pt-8"
                title="유사한 뉴스"
                items={similarItems}
                onItemClick={(item) => setCurrentId(item.id)}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
