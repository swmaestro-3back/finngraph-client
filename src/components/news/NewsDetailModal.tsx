import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, CircleAlert, RotateCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Hop } from '@/components/graph/HopSelector'
import { NewsEntityChips } from '@/components/news/NewsEntityChips'
import { NewsGraphSection } from '@/components/news/NewsGraphSection'
import { NewsSummary } from '@/components/news/NewsSummary'
import { NewsStockChips } from '@/components/news/NewsStockChips'
import { NewsSection } from '@/components/theme/NewsSection'
import { toNewsItem } from '@/lib/apiMappers'
import { formatDateTime, pressOf } from '@/lib/format'
import { newsEntities, useNewsGraph } from '@/lib/useNewsGraph'
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

  const entities = useMemo(
    () => (graphData ? newsEntities(graphData.relations) : []),
    [graphData],
  )
  const relatedStocks = companies ?? []
  const similarItems = useMemo(() => similar.map(toNewsItem), [similar])

  const open = newsId !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
          'flex flex-col gap-0 overflow-hidden p-0 sm:max-w-[1080px]',
          // 세로 중앙 대신 헤더(56px)와 기존 중앙 시작점 사이 절반인 100px에 상단 고정
          'top-[100px] max-h-[calc(100vh-124px)] translate-y-0',
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

              {relatedStocks.length > 0 && (
                <div className="mb-6">
                  <NewsStockChips stocks={relatedStocks} onNavigate={() => onOpenChange(false)} />
                </div>
              )}

              <NewsSummary
                summary={news.summary}
                stocks={relatedStocks}
                onNavigate={() => onOpenChange(false)}
              />
            </article>

            {graphData && graphData.graph.metadata.stats.total_nodes > 0 && (
              <section className="mt-10 border-t border-border pt-8">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">기사 속 관계</h3>
                  <span className="text-caption text-muted-foreground">
                    {`엔티티 ${graphData.graph.metadata.stats.total_nodes} · 관계 ${graphData.graph.metadata.stats.total_edges}` +
                      (hop > 1 ? ` · ${hop}Hop 확장` : '')}
                  </span>
                </div>
                {entities.length > 0 && (
                  <div className="mb-3">
                    <NewsEntityChips entities={entities} onHover={setHoveredNodeId} />
                  </div>
                )}
                <NewsGraphSection
                  graph={graphData.graph}
                  relations={graphData.relations}
                  expanded={graphData.expanded}
                  seedIds={graphData.seedIds}
                  hop={hop}
                  onHopChange={setHop}
                  hoveredNodeId={hoveredNodeId}
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
