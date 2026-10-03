import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChipGroup } from '@/components/layout/ChipGroup'
import { DataNotice } from '@/components/layout/DataNotice'
import { ErrorState } from '@/components/layout/ErrorState'
import { FavoriteStar } from '@/components/favorite/FavoriteStar'
import { NewsDetailModal } from '@/components/news/NewsDetailModal'
import { IssueLane } from '@/components/stock/IssueLane'
import { IssueNewsPanel } from '@/components/stock/IssueNewsPanel'
import { LeaderStockCard } from '@/components/theme/LeaderStockCard'
import { NewsSection } from '@/components/theme/NewsSection'
import { RelatedStocksTable } from '@/components/theme/RelatedStocksTable'
import {
  CloseDate,
  ThemeCountFacts,
  ThemeMetricCaption,
} from '@/components/theme/ThemeMetricSummary'
import { CANDLE_COUNTS, CANDLE_PERIODS, type CandlePeriod } from '@/lib/apiTypes'
import { buildIssueTimeline, candleDates, toNewsItem } from '@/lib/apiMappers'
import { changeColorClass, formatChangeOrDash } from '@/lib/format'
import { useBackTarget } from '@/lib/navigation'
import { useThemeDetail } from '@/lib/queries/useThemeDetail'
import { useThemeNews } from '@/lib/queries/useThemeNews'
import { useThemeStocks } from '@/lib/queries/useThemeStocks'
import { cn } from '@/lib/utils'

// 대시보드의 관련 뉴스와 같은 높이에서 안쪽 스크롤 — 뉴스가 적으면 빈 칸 없이 내용만큼만 차지한다
const NEWS_LIST_CLASS =
  'max-h-[max(280px,31.667vw)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

export default function ThemeDetailPage() {
  const { themeId } = useParams()
  const parsedId = Number(themeId)
  const id = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null
  const back = useBackTarget({ to: '/', label: '테마 대시보드' })
  const [period, setPeriod] = useState<CandlePeriod>('D')
  const [openNewsId, setOpenNewsId] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const { data: theme, loading, error, refetch } = useThemeDetail(id)
  const { data: stocks } = useThemeStocks(id)
  const { data: newsDetails } = useThemeNews(id)

  const dates = useMemo(() => candleDates(period), [period])
  const issues = useMemo(
    () => buildIssueTimeline(newsDetails ?? [], dates, period),
    [newsDetails, dates, period],
  )
  const news = useMemo(() => (newsDetails ?? []).map(toNewsItem), [newsDetails])

  useEffect(() => {
    setSelectedIndex(CANDLE_COUNTS[period] - 1)
  }, [period, id])

  const clearSelection = useCallback(() => setSelectedIndex(null), [])

  return (
    <div className="page-container pb-12 pt-7">
      <div className="mb-3 flex items-center gap-[9px]">
        <Link to={back.to} className="text-xs font-semibold leading-none text-primary">
          ← {back.label}
        </Link>
        <span className="text-caption text-foreground-tertiary">/</span>
        <span className="text-caption text-muted-foreground">테마 상세</span>
      </div>

      {loading && (
        <>
          <div className="mb-3 h-9 w-64 animate-pulse rounded bg-muted" />
          <div className="mb-4 h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-40 animate-pulse rounded-2xl bg-muted" />
          <div className="mt-4 h-64 animate-pulse rounded-2xl bg-muted" />
        </>
      )}

      {!loading && error && (
        <ErrorState
          error={error}
          onRetry={refetch}
          notFound={{
            title: '존재하지 않는 테마입니다',
            message: '요청하신 테마를 찾을 수 없습니다.',
            action: { to: '/themes', label: '테마 목록으로' },
          }}
        />
      )}

      {!loading && !error && theme && (
        <>
          <div className="mb-2 flex flex-wrap items-baseline gap-x-[9px] gap-y-1">
            <h1 className="text-display font-normal leading-[1.1] tracking-[-0.8px] text-foreground">
              {theme.name}
            </h1>
            <FavoriteStar type="THEME" targetKey={String(theme.id)} label={theme.name} />
            <span
              className={cn(
                'font-mono text-base font-medium tracking-[-0.5px]',
                theme.change === null ? 'text-foreground-tertiary' : changeColorClass(theme.change),
              )}
            >
              {formatChangeOrDash(theme.change)}
            </span>
            <CloseDate baseDate={theme.baseDate} />
          </div>
          <ThemeCountFacts theme={theme} className="mb-1.5" />
          <ThemeMetricCaption theme={theme} className="mb-3" />

          {theme.description && (
            <p className="mb-4 max-w-[820px] text-body leading-[1.7] text-muted-foreground [text-wrap:pretty]">
              {theme.description}
            </p>
          )}

          <div className="mb-[9px] flex items-center justify-between gap-2">
            <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">
              이슈 타임라인
            </h2>
            <ChipGroup options={CANDLE_PERIODS} value={period} onChange={setPeriod} />
          </div>
          <div key={`${theme.name}-${period}`} className="card-surface mb-4 p-5">
            <IssueLane
              days={issues}
              hoveredIndex={hoveredIndex}
              selectedIndex={selectedIndex}
              onHover={setHoveredIndex}
              onSelect={setSelectedIndex}
            />
          </div>
          <IssueNewsPanel
            days={issues}
            selectedIndex={selectedIndex}
            onSelectNews={setOpenNewsId}
            onClearSelection={clearSelection}
          />

          <LeaderStockCard themeName={theme.name} stocks={stocks ?? []} />

          <RelatedStocksTable stocks={stocks ?? []} />

          <NewsSection
            title={`${theme.name} 관련 뉴스`}
            items={news}
            className="mt-4"
            listClassName={NEWS_LIST_CLASS}
            relationFilter
            onItemClick={(item) => setOpenNewsId(item.id)}
          />
        </>
      )}

      <NewsDetailModal
        newsId={openNewsId}
        onOpenChange={(open) => !open && setOpenNewsId(null)}
      />

      <DataNotice className="mt-5" />
    </div>
  )
}
