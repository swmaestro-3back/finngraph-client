import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ChipGroup } from '@/components/layout/ChipGroup'
import { DataNotice } from '@/components/layout/DataNotice'
import { ErrorState } from '@/components/layout/ErrorState'
import { AnnualCharts } from '@/components/stock/AnnualCharts'
import { CompanyOverview } from '@/components/stock/CompanyOverview'
import { ContractSection } from '@/components/stock/ContractSection'
import { FinancialTable } from '@/components/stock/FinancialTable'
import { NewsDetailModal } from '@/components/news/NewsDetailModal'
import { IssueNewsPanel } from '@/components/stock/IssueNewsPanel'
import { PriceIssueCard } from '@/components/stock/PriceIssueCard'
import { StockLogo } from '@/components/stock/StockLogo'
import { StockMetricsCard } from '@/components/stock/StockMetricsCard'
import { SupplyDemandCharts } from '@/components/stock/SupplyDemandCharts'
import { SupplyStreakBadges } from '@/components/stock/SupplyStreakBadges'
import { ThemePeerComparison } from '@/components/stock/ThemePeerComparison'
import { FavoriteStar } from '@/components/favorite/FavoriteStar'
import { buildIssueTimeline, toCandleDates, toCandleView, toSupplyPoint } from '@/lib/apiMappers'
import {
  ANNUAL_PERIODS,
  DEFAULT_ANNUAL_PERIOD,
  sliceRecentYears,
  yearsFor,
  type AnnualPeriod,
} from '@/lib/annualPeriod'
import {
  SUPPLY_RANGES,
  SUPPLY_RANGE_LIMITS,
  type CandlePeriod,
  type SupplyRange,
} from '@/lib/apiTypes'
import {
  changeColorClass,
  formatChangeOrDash,
  formatPriceOrDash,
} from '@/lib/format'
import { fromState, useBackTarget } from '@/lib/navigation'
import { useCandles } from '@/lib/queries/useCandles'
import { useFinancials } from '@/lib/queries/useFinancials'
import { useInvestorFlows } from '@/lib/queries/useInvestorFlows'
import { useStockDetail } from '@/lib/queries/useStockDetail'
import { useStockNews } from '@/lib/queries/useStockNews'
import { lastTradingDate } from '@/lib/referenceDate'
import { cn } from '@/lib/utils'

// 섹션 사이 구분선 — 접힌 상태에서도 남아 어디서 다음 섹션이 시작하는지 보여준다
const SECTION_HEADER = 'mb-[9px] mt-6 border-t border-border pt-6'

const SUPPLY_FETCH_LIMIT = Math.max(...SUPPLY_RANGES.map((r) => r.limit))

export default function StockDetailPage() {
  const { stockCode } = useParams()
  const code = stockCode ?? ''
  const { pathname } = useLocation()
  const back = useBackTarget({ to: '/stocks', label: '주식 목록' })
  const [period, setPeriod] = useState<CandlePeriod>('D')
  const [supplyRange, setSupplyRange] = useState<SupplyRange>('6M')
  const [supplyOpen, setSupplyOpen] = useState(true)
  const [annualOpen, setAnnualOpen] = useState(true)
  const [annualPeriod, setAnnualPeriod] = useState<AnnualPeriod>(DEFAULT_ANNUAL_PERIOD)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [openNewsId, setOpenNewsId] = useState<string | null>(null)

  const { data: stock, loading, error, refetch } = useStockDetail(code)
  const { data: candleRes } = useCandles(code, period)
  // 수급은 가장 긴 기간으로 한 번 받아 두고 칩에 따라 잘라 쓴다 — 뱃지(연속 일수·보유율 증감)는 칩과 무관하게 전체를 본다
  const { data: flowRes } = useInvestorFlows(code, SUPPLY_FETCH_LIMIT)
  const { data: financialRows } = useFinancials(code)
  const { data: newsRows, loading: newsLoading } = useStockNews(code)

  const candles = useMemo(
    () => (candleRes ?? []).map((c) => toCandleView(c, period)),
    [candleRes, period],
  )
  const issues = useMemo(
    () =>
      // 종목 전환 직후 useApi가 이전 종목 뉴스를 유지하므로, 로딩 중에는 타임라인을 만들지 않는다
      !newsLoading && candleRes && candleRes.length > 0
        ? buildIssueTimeline(newsRows ?? [], toCandleDates(candleRes, period), period)
        : [],
    [candleRes, newsRows, newsLoading, period],
  )
  const supply = useMemo(
    () => (flowRes ?? []).slice(-SUPPLY_RANGE_LIMITS[supplyRange]).map(toSupplyPoint),
    [flowRes, supplyRange],
  )
  // 연간 실적 차트가 보는 연도 범위 — memo 자식이 헛돌지 않도록 참조를 유지 (표는 항상 전체 기간)
  const annualRows = useMemo(
    () => sliceRecentYears(financialRows ?? [], yearsFor(annualPeriod)),
    [financialRows, annualPeriod],
  )

  // 뉴스 응답의 정렬이 보장되지 않으므로 수집 시각 기준 최신 1건을 직접 고른다
  // 로딩 중에는 null — 종목 전환 직후 이전 종목의 뉴스가 '최근 이슈'로 노출되는 것을 막는다
  const latestNews = useMemo(() => {
    if (newsLoading) return null
    const dated = (newsRows ?? []).filter((n) => !Number.isNaN(new Date(n.collectedAt).getTime()))
    dated.sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime())
    return dated[0] ?? null
  }, [newsRows, newsLoading])

  // 백엔드가 요청한 개수보다 적게 줄 수 있으므로(주봉·월봉 적재 이력이 짧음) 실제 마지막 캔들을 고른다
  useEffect(() => {
    setSelectedIndex(candles.length > 0 ? candles.length - 1 : null)
  }, [candles, period, code])

  const clearSelection = useCallback(() => setSelectedIndex(null), [])

  return (
    <div className="page-container pb-12 pt-7">
      <div className="mb-3 flex items-center gap-[9px]">
        <Link to={back.to} className="text-xs font-semibold leading-none text-primary">
          ← {back.label}
        </Link>
        {stock?.themeId != null && stock.themeName && (
          <>
            <span className="text-caption text-foreground-tertiary">/</span>
            <Link
              to={`/theme/${stock.themeId}`}
              state={fromState(pathname)}
              className="text-caption text-muted-foreground hover:text-primary hover:underline"
            >
              {stock.themeName}
            </Link>
          </>
        )}
      </div>

      {loading && (
        <>
          <div className="mb-3 h-9 w-72 animate-pulse rounded bg-muted" />
          <div className="mb-4 grid grid-cols-2 gap-[9px] md:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-muted" />
        </>
      )}

      {!loading && error && (
        <ErrorState
          error={error}
          onRetry={refetch}
          notFound={{
            title: '존재하지 않는 종목입니다',
            message: `"${code}" 종목을 찾을 수 없습니다.`,
            action: { to: '/stocks', label: '주식 목록으로' },
          }}
        />
      )}

      {!loading && !error && stock && (
        <>
          <div className="mb-3 flex flex-wrap items-baseline gap-[9px]">
            {/* 행은 baseline 정렬이라 이미지만 가운데로 뺀다 — 장식이므로 대체 텍스트는 종목명(h1)에 맡긴다 */}
            <StockLogo ticker={stock.ticker} className="self-center" />
            <h1 className="text-display font-normal leading-[1.1] tracking-[-0.8px] text-foreground">
              {stock.name}
            </h1>
            <FavoriteStar type="STOCK" targetKey={stock.ticker} label={stock.name} />
            <span className="font-mono text-body text-muted-foreground">{stock.ticker}</span>
            <span className="font-mono text-title font-medium tracking-[-0.5px] text-foreground">
              {formatPriceOrDash(stock.price)}
            </span>
            <span
              className={cn(
                'font-mono text-base font-medium',
                changeColorClass(stock.change ?? 0),
              )}
            >
              {formatChangeOrDash(stock.change)}
            </span>
            {/* 테마 대시보드의 "기업 그래프 →"와 같은 글자 링크 — 제목 줄이라 한 단계 크게 */}
            <Link
              to={`/graph/${stock.ticker}`}
              className="ml-auto flex min-h-11 items-center text-sm font-semibold text-primary hover:underline md:min-h-0"
            >
              기업 그래프 →
            </Link>
          </div>

          <CompanyOverview
            description={stock.description}
            source={stock.descriptionSource}
            rceptNo={stock.descriptionRceptNo}
          />

          {latestNews && (
            <div className="mb-3 flex min-w-0 items-baseline gap-1.5 text-caption text-muted-foreground">
              <span className="shrink-0">최근 이슈 —</span>
              <button
                type="button"
                onClick={() => setOpenNewsId(latestNews.id)}
                className="cursor-pointer truncate text-foreground hover:text-primary hover:underline"
              >
                {latestNews.title}
              </button>
            </div>
          )}

          <SupplyStreakBadges flows={flowRes ?? []} />

          {/* 테마 비교(좌) · 투자지표(우) — 테마 비교가 없으면(null) 지표가 전체 폭을 쓴다 */}
          <div className="mb-4 grid gap-4 lg:grid-cols-2 [&>*:only-child]:col-span-full">
            <ThemePeerComparison stock={stock} />
            <StockMetricsCard stock={stock} financials={financialRows} flows={flowRes} />
          </div>

          {/* 캔들이 뉴스보다 먼저 오면 issues가 빈 배열이라 이슈 레인이 days[0]에서 깨진다 — 둘 다 준비되면 그린다 */}
          {candles.length > 0 && issues.length > 0 ? (
            <PriceIssueCard
              key={`${stock.ticker}-${period}`}
              candles={candles}
              issues={issues}
              period={period}
              onPeriodChange={setPeriod}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
            />
          ) : (
            <div className="h-72 animate-pulse rounded-2xl bg-muted" />
          )}

          <div className={`${SECTION_HEADER} flex items-center gap-2`}>
            <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">
              이슈 타임라인
            </h2>
          </div>
          {issues.length > 0 && (
            <IssueNewsPanel
              days={issues}
              selectedIndex={selectedIndex}
              onSelectNews={setOpenNewsId}
              onClearSelection={clearSelection}
            />
          )}

          <ContractSection
            key={code}
            ticker={code}
            referenceDate={lastTradingDate(candleRes)}
            from={pathname}
            className={SECTION_HEADER}
          />

          <div className={`${SECTION_HEADER} flex items-center justify-between`}>
            <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">
              투자자별 수급
            </h2>
            <div className="flex items-center gap-3">
              {supplyOpen && (
                <ChipGroup options={SUPPLY_RANGES} value={supplyRange} onChange={setSupplyRange} />
              )}
              <button
                type="button"
                onClick={() => setSupplyOpen((open) => !open)}
                className="cursor-pointer text-muted-foreground"
                aria-label={supplyOpen ? '투자자별 수급 접기' : '투자자별 수급 펼치기'}
              >
                <ChevronUp
                  className={cn('size-4 transition-transform', !supplyOpen && 'rotate-180')}
                />
              </button>
            </div>
          </div>
          {supplyOpen &&
            (supply.length > 0 ? (
              // 기간이 바뀌면 리마운트 — 고정(pin)된 인덱스가 새 데이터 길이를 벗어나지 않도록
              <SupplyDemandCharts key={supplyRange} points={supply} />
            ) : (
              <p className="text-caption text-muted-foreground">수급 데이터가 없습니다.</p>
            ))}

          <div className={`${SECTION_HEADER} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">
                연간 실적
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {annualOpen && (
                <ChipGroup options={ANNUAL_PERIODS} value={annualPeriod} onChange={setAnnualPeriod} />
              )}
              <button
                type="button"
                onClick={() => setAnnualOpen((open) => !open)}
                className="cursor-pointer text-muted-foreground"
                aria-label={annualOpen ? '연간 실적 접기' : '연간 실적 펼치기'}
              >
                <ChevronUp
                  className={cn('size-4 transition-transform', !annualOpen && 'rotate-180')}
                />
              </button>
            </div>
          </div>
          {annualOpen &&
            (annualRows.length > 0 ? (
              // 종목·기간이 바뀌면 리마운트 — 고정(pin)된 인덱스가 새 데이터 길이를 벗어나지 않도록
              <AnnualCharts key={`${code}-${annualPeriod}`} rows={annualRows} />
            ) : (
              <p className="text-caption text-muted-foreground">연간 실적 데이터가 없습니다.</p>
            ))}

          <div className={`${SECTION_HEADER} flex items-center gap-2`}>
            <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">
              재무 지표 요약
            </h2>
          </div>
          {financialRows && financialRows.length > 0 ? (
            <FinancialTable rows={financialRows} />
          ) : (
            <p className="text-caption text-muted-foreground">재무 데이터가 없습니다.</p>
          )}
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
