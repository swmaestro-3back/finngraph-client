import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleAlert, RotateCw } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { NewsDetailModal } from '@/components/news/NewsDetailModal'
import { IssueLane } from '@/components/stock/IssueLane'
import { IssueNewsPanel } from '@/components/stock/IssueNewsPanel'
import { LeaderStockCard } from '@/components/theme/LeaderStockCard'
import { NewsSection } from '@/components/theme/NewsSection'
import { RelatedStocksTable } from '@/components/theme/RelatedStocksTable'
import { Button } from '@/components/ui/button'
import { FilterChip } from '@/components/ui/filter-chip'
import { CANDLE_COUNTS, candleDates, type CandlePeriod } from '@/data/candles'
import { buildIssueTimeline, toNewsItem } from '@/lib/apiMappers'
import { changeColorClass, formatChangeOrDash } from '@/lib/format'
import { useBackTarget } from '@/lib/navigation'
import { useThemeDetail } from '@/lib/queries/useThemeDetail'
import { useThemeNews } from '@/lib/queries/useThemeNews'
import { useThemeStocks } from '@/lib/queries/useThemeStocks'
import { cn } from '@/lib/utils'

const PERIODS: { key: CandlePeriod; label: string }[] = [
  { key: 'D', label: '1일' },
  { key: 'W', label: '1주' },
  { key: 'M', label: '1달' },
]

export default function ThemeDetailPage() {
  const { themeId } = useParams()
  const name = themeId ?? ''
  const back = useBackTarget({ to: '/', label: '테마 트리맵' })
  const [period, setPeriod] = useState<CandlePeriod>('D')
  const [openNewsId, setOpenNewsId] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const { data: theme, loading, error, refetch } = useThemeDetail(name)
  const { data: stocks } = useThemeStocks(name)
  const { data: newsDetails } = useThemeNews(name)

  const dates = useMemo(() => candleDates(period), [period])
  const issues = useMemo(
    () => buildIssueTimeline(newsDetails ?? [], dates, period),
    [newsDetails, dates, period],
  )
  const news = useMemo(() => (newsDetails ?? []).map(toNewsItem), [newsDetails])

  useEffect(() => {
    setSelectedIndex(CANDLE_COUNTS[period] - 1)
  }, [period, name])

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
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <CircleAlert className="size-8 text-muted-foreground" />
          <h1 className="text-lg font-medium text-foreground">
            {error.isNotFound ? '존재하지 않는 테마입니다' : '일시적인 오류'}
          </h1>
          <p className="text-body text-muted-foreground">
            {error.isNotFound
              ? `"${name}" 테마를 찾을 수 없습니다.`
              : error.isRetryable
                ? '일시적으로 데이터를 불러올 수 없습니다.'
                : '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
          </p>
          {error.isNotFound ? (
            <Button variant="outline" size="sm" asChild>
              <Link to="/themes">테마 목록으로</Link>
            </Button>
          ) : (
            error.isRetryable && (
              <Button variant="outline" size="sm" onClick={refetch}>
                <RotateCw data-icon="inline-start" />
                다시 시도
              </Button>
            )
          )}
        </div>
      )}

      {!loading && !error && theme && (
        <>
          <div className="mb-3 flex items-baseline gap-[9px]">
            <h1 className="text-display font-normal leading-[1.1] tracking-[-0.8px] text-foreground">
              {theme.name}
            </h1>
            <span
              className={cn(
                'font-mono text-base font-medium tracking-[-0.5px]',
                changeColorClass(theme.change ?? 0),
              )}
            >
              {formatChangeOrDash(theme.change)}
            </span>
          </div>

          {theme.description && (
            <p className="mb-4 max-w-[820px] text-body leading-[1.7] text-muted-foreground [text-wrap:pretty]">
              {theme.description}
            </p>
          )}

          <div className="mb-[9px] flex items-center justify-between gap-2">
            <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">
              이슈 타임라인
            </h2>
            <div className="flex gap-1.5">
              {PERIODS.map((p) => (
                <FilterChip
                  key={p.key}
                  active={period === p.key}
                  onClick={() => setPeriod(p.key)}
                >
                  {p.label}
                </FilterChip>
              ))}
            </div>
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

          <LeaderStockCard stocks={stocks ?? []} period={period} />

          <RelatedStocksTable stocks={stocks ?? []} />

          <NewsSection
            title={`${theme.name} 관련 뉴스`}
            items={news}
            className="mt-4"
            onItemClick={(item) => setOpenNewsId(item.id)}
          />
        </>
      )}

      <NewsDetailModal
        newsId={openNewsId}
        onOpenChange={(open) => !open && setOpenNewsId(null)}
      />

      <p className="mt-5 text-caption text-muted-foreground">
        표시된 시세·차트·뉴스는 데모용 시드 데이터입니다. 투자 판단의 근거로 사용할 수
        없습니다.
      </p>
    </div>
  )
}
