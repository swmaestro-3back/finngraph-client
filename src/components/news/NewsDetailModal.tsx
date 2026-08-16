import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink } from 'lucide-react'
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
import { toNewsItem } from '@/data/news'
import { newsEntities, pressOf } from '@/data/newsDetail'
import { formatRelativeTime } from '@/lib/format'
import { useNewsGraph } from '@/lib/useNewsGraph'

interface Props {
  /** 열 뉴스 id (null이면 닫힘) */
  newsId: string | null
  onOpenChange: (open: boolean) => void
}

/** 뉴스 상세 모달 — 요약, 기사에서 추출된 관계 그래프, 관련 종목, 유사한 뉴스 */
export function NewsDetailModal({ newsId, onOpenChange }: Props) {
  // 유사한 뉴스를 누르면 모달을 쌓지 않고 내용만 바꾼다
  const [currentId, setCurrentId] = useState<string | null>(newsId)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  /** 기사를 원점으로 몇 홉까지 볼지 — 1이면 기사에 나온 엔티티까지 */
  const [hop, setHop] = useState<Hop>(1)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (newsId) setCurrentId(newsId)
  }, [newsId])

  // 다른 뉴스로 갈아탈 때 앞 기사에서 보던 위치·강조·펼침이 남지 않도록 되돌린다
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
    setHoveredNodeId(null)
    setHop(1)
  }, [currentId])

  const { data, similar } = useNewsGraph(currentId, hop)

  const entities = useMemo(() => (data ? newsEntities(data.relations) : []), [data])
  const companyNames = useMemo(
    () => entities.filter((e) => e.type === 'company').map((e) => e.label),
    [entities],
  )
  const similarItems = useMemo(() => similar.map(toNewsItem), [similar])

  // 없는 뉴스 id면 열지 않는다
  const open = newsId !== null && data !== null
  if (!data) return null

  const { news, relations, graph, seedIds } = data

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid h-[min(90vh,860px)] grid-rows-[auto_minmax(0,1fr)] gap-0 p-0 sm:max-w-[1080px]">
        {/* 헤더 — 스크롤해도 어떤 기사를 보고 있는지 유지된다 */}
        <div className="border-b border-border px-6 pt-5 pb-4">
          <DialogDescription className="text-[11px]">
            {pressOf(news.url)} · {formatRelativeTime(news.collectedAt)} 수집
          </DialogDescription>

          <div className="mt-1.5 mb-3 flex items-start justify-between gap-4 pr-8">
            <DialogTitle className="text-xl leading-snug tracking-[-0.4px]">
              {news.title}
            </DialogTitle>
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <a href={news.url} target="_blank" rel="noopener noreferrer">
                원문 보기
                <ExternalLink data-icon="inline-end" />
              </a>
            </Button>
          </div>

          <NewsEntityChips entities={entities} onHover={setHoveredNodeId} />
        </div>

        {/* 본문 */}
        <div ref={bodyRef} className="overflow-y-auto px-6 py-5">
          <Section title="요약">
            <p className="text-[13px] leading-[1.75] text-foreground [text-wrap:pretty]">
              {news.summary}
            </p>
          </Section>

          <Section
            title="기사 속 관계"
            meta={
              // 화면에 그려진 수 — 1홉이면 relations.length와 같다
              `엔티티 ${graph.metadata.stats.total_nodes} · 관계 ${graph.metadata.stats.total_edges}` +
              (hop > 1 ? ` · ${hop}Hop 확장` : '')
            }
          >
            <NewsGraphSection
              graph={graph}
              relations={relations}
              seedIds={seedIds}
              hop={hop}
              onHopChange={setHop}
              hoveredNodeId={hoveredNodeId}
            />
          </Section>

          {companyNames.length > 0 && (
            <Section title="관련 종목">
              <RelatedStocks
                companyNames={companyNames}
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
      </DialogContent>
    </Dialog>
  )
}
