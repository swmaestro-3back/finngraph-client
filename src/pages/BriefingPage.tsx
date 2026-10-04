import { useCallback, useMemo, useState } from 'react'
import { CircleAlert, RotateCw } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { BriefingHeader } from '@/components/briefing/BriefingHeader'
import { HeadlineCard } from '@/components/briefing/HeadlineCard'
import { IssueCard } from '@/components/briefing/IssueCard'
import { RecentContractsBoard } from '@/components/briefing/RecentContractsBoard'
import { RelationDigest } from '@/components/briefing/RelationDigest'
import { RiskList } from '@/components/briefing/RiskList'
import { WatchPointList } from '@/components/briefing/WatchPointList'
import { DataNotice } from '@/components/layout/DataNotice'
import { NewsDetailModal } from '@/components/news/NewsDetailModal'
import { Button } from '@/components/ui/button'
import { AI_NOTICE, adjacentDates, lockedTeaser } from '@/lib/briefing'
import { useBriefing, useBriefingDates } from '@/lib/queries/useBriefing'

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mb-3 text-lg font-medium tracking-[-0.4px] text-foreground">
      {children}
    </h2>
  )
}

export default function BriefingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedDate = searchParams.get('date')
  const { data: briefing, loading, error, notFound, refetch } = useBriefing(requestedDate)
  const { data: dates } = useBriefingDates(30)
  const [openNewsId, setOpenNewsId] = useState<string | null>(null)

  const nav = useMemo(
    () => adjacentDates(dates?.map((d) => d.baseDate) ?? [], briefing?.baseDate ?? ''),
    [dates, briefing],
  )

  const navigate = useCallback(
    (date: string | null) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (date) next.set('date', date)
        else next.delete('date')
        return next
      })
    },
    [setSearchParams],
  )

  const locked = briefing?.locked ?? null
  const teaser = locked ? lockedTeaser(locked) : ''

  return (
    <div className="page-container pb-12 pt-7">
      <BriefingHeader
        baseDate={briefing?.baseDate ?? null}
        generatedAt={briefing?.generatedAt ?? null}
        status={briefing?.status ?? null}
        prev={nav.prev}
        next={nav.next}
        onNavigate={navigate}
      />

      {loading && (
        <div className="flex flex-col gap-5">
          <div className="h-28 animate-pulse rounded-2xl bg-muted" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-muted" />
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <CircleAlert className="size-8 text-muted-foreground" />
          <p className="text-body text-muted-foreground">
            {error.isRetryable
              ? '일시적으로 데이터를 불러올 수 없습니다.'
              : '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
          </p>
          {error.isRetryable && (
            <Button variant="outline" size="sm" onClick={refetch}>
              <RotateCw data-icon="inline-start" />
              다시 시도
            </Button>
          )}
        </div>
      )}

      {!loading && notFound && (
        <div className="card-surface flex flex-col items-center gap-2 px-6 py-12 text-center">
          <p className="text-body font-medium text-foreground">
            {requestedDate ? `${requestedDate} 브리핑이 없습니다.` : '브리핑이 아직 생성되지 않았습니다.'}
          </p>
          <p className="text-caption text-muted-foreground [text-wrap:pretty]">
            평일 시세·재무 적재가 끝난 뒤 생성됩니다. 보통 19시 이후 갱신됩니다.
          </p>
          {requestedDate && (
            <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate(null)}>
              최신 브리핑 보기
            </Button>
          )}
        </div>
      )}

      {!loading && !error && briefing && (
        <div className="flex flex-col gap-8">
          {teaser && <p className="text-caption text-muted-foreground">{teaser}</p>}

          <HeadlineCard headline={briefing.headline} market={briefing.market} />

          <section aria-labelledby="briefing-issues-title">
            <SectionTitle id="briefing-issues-title">TOP 이슈</SectionTitle>
            {briefing.issues.length === 0 ? (
              <p className="card-surface p-5 text-body text-muted-foreground">
                기준일에 3건 이상 묶인 이슈가 없습니다.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {briefing.issues.map((issue) => (
                  <IssueCard key={issue.clusterId} issue={issue} locked={locked !== null} />
                ))}
              </div>
            )}
          </section>

          <RelationDigest
            analyzedNews={briefing.analyzedNews}
            graph={briefing.relationGraph}
            locked={locked}
            onOpenNews={setOpenNewsId}
          />


          <section aria-labelledby="briefing-watch-title">
            <SectionTitle id="briefing-watch-title">지켜볼 점</SectionTitle>
            <WatchPointList points={briefing.watchPoints} lockedCount={locked?.watchPoints ?? 0} />
          </section>

          <section aria-labelledby="briefing-risks-title">
            <SectionTitle id="briefing-risks-title">리스크 모니터</SectionTitle>
            <RiskList risks={briefing.risks} lockedCount={locked?.risks ?? 0} />
          </section>
        </div>
      )}

      {!loading && !error && (
        <div className="mt-8">
          <RecentContractsBoard />
        </div>
      )}

      <DataNotice className="mt-5" />
      <p className="mt-1 text-caption text-muted-foreground break-keep [text-wrap:pretty]">{AI_NOTICE}</p>

      <NewsDetailModal newsId={openNewsId} onOpenChange={(open) => !open && setOpenNewsId(null)} />
    </div>
  )
}
