import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LockedBlock } from '@/components/briefing/LockedBlock'
import { RelationGraphCard } from '@/components/briefing/RelationGraphCard'
import { RelationLineRow } from '@/components/briefing/RelationLineRow'
import { NewsRelationBadge } from '@/components/news/NewsRelationBadge'
import type { AnalyzedNewsRes, BriefingLockedRes, RelationGraphRes } from '@/lib/apiTypes'
import { relationDigestCaption } from '@/lib/briefing'
import { changeColorClass, formatChangeOrDash, formatRelativeTime, pressName } from '@/lib/format'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface RelationDigestProps {
  analyzedNews: AnalyzedNewsRes[]
  graph: RelationGraphRes | null
  locked: BriefingLockedRes | null
  onOpenNews: (newsId: string) => void
}

function AnalyzedNewsCard({
  news,
  locked,
  onOpenNews,
  onHover,
}: {
  news: AnalyzedNewsRes
  locked: boolean
  onOpenNews: (newsId: string) => void
  onHover: (edgeId: string | null) => void
}) {
  const { pathname } = useLocation()
  return (
    <article className="flex flex-col gap-2 border-b border-surface-inset py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onOpenNews(String(news.newsId))}
          className="min-w-0 cursor-pointer text-left text-body font-semibold leading-snug text-foreground hover:text-primary [text-wrap:balance]"
        >
          {news.title}
        </button>
        <NewsRelationBadge tripleExtracted />
      </div>
      <p className="flex items-center gap-2 text-caption text-muted-foreground">
        {news.url && <span className="font-medium text-foreground-secondary">{pressName(news.url)}</span>}
        {news.publishedAt && <span className="font-mono tabular-nums">{formatRelativeTime(news.publishedAt)}</span>}
        <span>
          관계 <span className="font-mono tabular-nums">{news.relationCount}</span>건
        </span>
      </p>
      {news.summary && <p className="line-clamp-2 text-caption leading-relaxed text-foreground-secondary">{news.summary}</p>}
      {news.companies.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {news.companies.map((s) => (
            <li key={s.ticker}>
              <Link
                to={`/stock/${s.ticker}`}
                state={fromState(pathname)}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-micro font-medium text-foreground hover:bg-muted"
              >
                {s.name}
                <span className={cn('font-mono tabular-nums', changeColorClass(s.change ?? 0))}>
                  {formatChangeOrDash(s.change)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {locked || news.relations === null ? (
        <LockedBlock
          title="관계는 로그인 후 볼 수 있어요"
          lines={Math.min(3, Math.max(1, news.relationCount))}
        />
      ) : (
        <ul className="flex flex-col">
          {news.relations.map((line) => (
            <RelationLineRow key={line.id} line={line} onHover={onHover} />
          ))}
        </ul>
      )}
    </article>
  )
}

export function RelationDigest({ analyzedNews, graph, locked, onOpenNews }: RelationDigestProps) {
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const isLocked = locked !== null

  return (
    <section aria-labelledby="relation-digest-title">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="relation-digest-title" className="text-lg font-medium tracking-[-0.4px] text-foreground">
          오늘 추출된 관계
        </h2>
        <p className="text-caption text-muted-foreground">{relationDigestCaption(analyzedNews, graph, locked)}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="card-surface px-5 py-2">
          {analyzedNews.length === 0 ? (
            <p className="py-6 text-body text-muted-foreground [text-wrap:pretty]">
              기준일 창에 관계가 추출된 기사가 없습니다. 추출은 매시 정각에 돌아 최근 기사는 대기 중일 수 있습니다.
            </p>
          ) : (
            analyzedNews.map((news) => (
              <AnalyzedNewsCard
                key={news.newsId}
                news={news}
                locked={isLocked}
                onOpenNews={onOpenNews}
                onHover={setHoveredEdgeId}
              />
            ))
          )}
        </div>
        <RelationGraphCard graph={graph} locked={locked} hoveredEdgeId={hoveredEdgeId} onOpenNews={onOpenNews} />
      </div>
    </section>
  )
}
