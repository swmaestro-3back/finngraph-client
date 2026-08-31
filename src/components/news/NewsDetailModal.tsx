import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleAlert, ExternalLink, RotateCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/graph/DetailParts'
import type { Hop } from '@/components/graph/HopSelector'
import { NewsEntityChips } from '@/components/news/NewsEntityChips'
import { NewsGraphSection } from '@/components/news/NewsGraphSection'
import { RelatedStocks } from '@/components/news/RelatedStocks'
import { NewsSection } from '@/components/theme/NewsSection'
import { newsEntities } from '@/data/graphNews'
import { toNewsItem } from '@/lib/apiMappers'
import { formatRelativeTime, pressOf } from '@/lib/format'
import { useNewsGraph } from '@/lib/useNewsGraph'
import { useNewsCompanies } from '@/lib/queries/useNewsCompanies'
import { useNewsDetail } from '@/lib/queries/useNewsDetail'

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
      <DialogContent className="grid h-[min(90vh,860px)] grid-rows-[auto_minmax(0,1fr)] gap-0 p-0 sm:max-w-[1080px]">
        {loading && (
          <>
            <div className="border-b border-border px-6 pt-5 pb-4">
              <DialogTitle className="sr-only">뉴스 불러오는 중</DialogTitle>
              <DialogDescription className="sr-only">
                뉴스를 불러오고 있습니다
              </DialogDescription>
              <div className="h-3.5 w-40 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-6 w-3/4 animate-pulse rounded bg-muted" />
            </div>
            <div className="px-6 py-5">
              <div className="h-32 animate-pulse rounded-lg bg-muted" />
            </div>
          </>
        )}

        {!loading && error && (
          <>
            <div className="border-b border-border px-6 pt-5 pb-4">
              <DialogTitle className="text-xl leading-snug tracking-[-0.4px]">
                {error.isNotFound ? '뉴스를 찾을 수 없습니다' : '일시적인 오류'}
              </DialogTitle>
              <DialogDescription className="sr-only">뉴스 조회 실패</DialogDescription>
            </div>
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
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
          </>
        )}

        {!loading && !error && news && (
          <>
            <div className="border-b border-border px-6 pt-5 pb-4">
              <DialogDescription className="text-caption">
                {pressOf(news.url)} · {formatRelativeTime(news.collectedAt)}
              </DialogDescription>

              <div className="mt-1.5 mb-3 flex items-start justify-between gap-4 pr-8">
                <DialogTitle className="text-xl leading-snug tracking-[-0.4px]">
                  {news.title}
                </DialogTitle>
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <a href={news.url} target="_blank" rel="noopener noreferrer">
                    기사 보기
                    <ExternalLink data-icon="inline-end" />
                  </a>
                </Button>
              </div>

              <NewsEntityChips entities={entities} onHover={setHoveredNodeId} />
            </div>

            <div ref={bodyRef} className="overflow-y-auto px-6 py-5">
              <Section title="요약">
                <p className="text-body leading-[1.75] text-foreground [text-wrap:pretty]">
                  {news.summary}
                </p>
              </Section>

              {graphData && graphData.graph.metadata.stats.total_nodes > 0 && (
                <Section
                  title="기사 속 관계"
                  meta={
                    `엔티티 ${graphData.graph.metadata.stats.total_nodes} · 관계 ${graphData.graph.metadata.stats.total_edges}` +
                    (hop > 1 ? ` · ${hop}Hop 확장` : '')
                  }
                >
                  <NewsGraphSection
                    graph={graphData.graph}
                    relations={graphData.relations}
                    expanded={graphData.expanded}
                    seedIds={graphData.seedIds}
                    hop={hop}
                    onHopChange={setHop}
                    hoveredNodeId={hoveredNodeId}
                  />
                </Section>
              )}

              {relatedStocks.length > 0 && (
                <Section title="관련 종목">
                  <RelatedStocks
                    stocks={relatedStocks}
                    onNavigate={() => onOpenChange(false)}
                  />
                </Section>
              )}

              {similarItems.length > 0 && (
                <NewsSection
                  title="유사한 뉴스"
                  items={similarItems}
                  onItemClick={(item) => setCurrentId(item.id)}
                />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
