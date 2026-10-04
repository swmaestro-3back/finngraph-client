import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ChipGroup } from '@/components/layout/ChipGroup'
import { DataNotice } from '@/components/layout/DataNotice'
import { ErrorState } from '@/components/layout/ErrorState'
import { NewsDetailModal } from '@/components/news/NewsDetailModal'
import { AnnualCharts } from '@/components/stock/AnnualCharts'
import { CompanyOverview } from '@/components/stock/CompanyOverview'
import { ContractSection } from '@/components/stock/ContractSection'
import { FinancialTable } from '@/components/stock/FinancialTable'
import { IssueNewsPanel } from '@/components/stock/IssueNewsPanel'
import { PriceIssueCard } from '@/components/stock/PriceIssueCard'
import { ReasonTab } from '@/components/stock/ReasonTab'
import { StockHeader } from '@/components/stock/StockHeader'
import { RailCard, StockOverviewLayout } from '@/components/stock/StockOverviewLayout'
import { StockSectionTabs, useStockTab, type StockTab } from '@/components/stock/StockSectionTabs'
import { StockMetricsCard } from '@/components/stock/StockMetricsCard'
import { StockStatGrid } from '@/components/stock/StockStatGrid'
import { SupplyDemandCharts } from '@/components/stock/SupplyDemandCharts'
import { supplyStreakBadges } from '@/components/stock/SupplyStreakBadges'
import { ThemePeerComparison, ThemePeerRanks } from '@/components/stock/ThemePeerComparison'
import { Button } from '@/components/ui/button'
import { buildIssueTimeline, toCandleDates, toCandleView, toSupplyPoint } from '@/lib/apiMappers'
import { profileRows } from '@/lib/companyOverview'
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
import { themePath } from '@/lib/fg/paths'
import { defaultIssueIndex } from '@/lib/issueSelection'
import { FREE_ISSUE_SLOTS, lockedIssueCount, useMemberGate } from '@/lib/memberGate'
import { MOVE_WINDOW, notableMoves } from '@/lib/moves'
import { fromState, useBackTarget } from '@/lib/navigation'
import { useCandles } from '@/lib/queries/useCandles'
import { useFinancials } from '@/lib/queries/useFinancials'
import { useInvestorFlows } from '@/lib/queries/useInvestorFlows'
import { useStockContracts } from '@/lib/queries/useStockContracts'
import { useStockDetail } from '@/lib/queries/useStockDetail'
import { useStockNews } from '@/lib/queries/useStockNews'
import { lastTradingDate } from '@/lib/referenceDate'

const CONTRACT_PREVIEW = 10

const SUPPLY_FETCH_LIMIT = Math.max(...SUPPLY_RANGES.map((r) => r.limit))

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function PanelHeader({ title, hint, actions }: { title: string; hint?: string; actions?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">{title}</h2>
        {hint && <span className="text-caption text-muted-foreground break-keep">{hint}</span>}
      </div>
      {actions}
    </div>
  )
}

function PageSkeleton() {
  return (
    <div aria-busy="true">
      <div className="mb-2 h-9 w-64 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="mb-6 h-6 w-48 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="h-96 animate-pulse rounded-3xl bg-muted motion-reduce:animate-none" />
        <div className="flex flex-col gap-3">
          <div className="h-44 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
          <div className="h-12 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
          <div className="h-36 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  )
}

export default function StockDetailPage() {
  const { stockCode } = useParams()
  const code = stockCode ?? ''
  const { pathname } = useLocation()
  const back = useBackTarget({ to: '/stocks', label: '주식 목록' })
  const { locked, promptLogin } = useMemberGate()
  const [tab, setTab] = useStockTab()
  const [period, setPeriod] = useState<CandlePeriod>('D')
  const [supplyRange, setSupplyRange] = useState<SupplyRange>('6M')
  const [annualPeriod, setAnnualPeriod] = useState<AnnualPeriod>(DEFAULT_ANNUAL_PERIOD)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [openNewsId, setOpenNewsId] = useState<string | null>(null)
  const pickedIndex = useRef<number | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  const { data: stock, loading, error, refetch } = useStockDetail(code)
  const overviewRows = profileRows(stock?.profile)
  const { data: dailyRes } = useCandles(code, 'D')
  const { data: periodRes } = useCandles(period === 'D' ? null : code, period)
  const { data: flowRes } = useInvestorFlows(code, Math.max(SUPPLY_FETCH_LIMIT, MOVE_WINDOW))
  const { data: financialRows } = useFinancials(code)
  const { data: newsRows, loading: newsLoading } = useStockNews(code)
  const contracts = useStockContracts(code)

  const candleRes = period === 'D' ? dailyRes : periodRes
  const candles = useMemo(() => (candleRes ?? []).map((c) => toCandleView(c, period)), [candleRes, period])
  const issues = useMemo(
    () =>
      !newsLoading && candleRes && candleRes.length > 0
        ? buildIssueTimeline(newsRows ?? [], toCandleDates(candleRes, period), period)
        : [],
    [candleRes, newsRows, newsLoading, period],
  )
  const sortedFlows = useMemo(
    () => [...(flowRes ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
    [flowRes],
  )
  const supply = useMemo(
    () => sortedFlows.slice(-SUPPLY_RANGE_LIMITS[supplyRange]).map(toSupplyPoint),
    [sortedFlows, supplyRange],
  )
  const annualRows = useMemo(
    () => sliceRecentYears(financialRows ?? [], yearsFor(annualPeriod)),
    [financialRows, annualPeriod],
  )
  const moves = useMemo(
    () =>
      dailyRes && !newsLoading && !contracts.loading
        ? notableMoves(dailyRes, sortedFlows, newsRows ?? [], contracts.data ?? [])
        : null,
    [dailyRes, sortedFlows, newsRows, newsLoading, contracts.data, contracts.loading],
  )
  const newsLockedBefore = useMemo(() => {
    if (!locked || !dailyRes || dailyRes.length <= FREE_ISSUE_SLOTS) return null
    const dates = dailyRes.map((c) => c.date).sort()
    return dates[dates.length - FREE_ISSUE_SLOTS]
  }, [locked, dailyRes])

  useEffect(() => {
    if (pickedIndex.current !== null && period === 'D') {
      setSelectedIndex(pickedIndex.current)
      pickedIndex.current = null
      return
    }
    setSelectedIndex(defaultIssueIndex(issues, lockedIssueCount(issues.length, locked)))
  }, [issues, period, code, locked])

  const clearSelection = useCallback(() => setSelectedIndex(null), [])

  const pickMove = useCallback(
    (date: string) => {
      const index = (dailyRes ?? []).findIndex((c) => c.date === date)
      if (index === -1) return
      if (index < lockedIssueCount(dailyRes?.length ?? 0, locked)) {
        promptLogin()
        return
      }
      if (period === 'D') setSelectedIndex(index)
      else {
        pickedIndex.current = index
        setPeriod('D')
      }
      chartRef.current?.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    },
    [dailyRes, locked, period, promptLogin],
  )

  const signals = supplyStreakBadges(flowRes ?? [])
  const referenceDate = lastTradingDate(dailyRes)

  const panels: Record<StockTab, ReactNode> = stock
    ? {
        reason: (
          <ReasonTab
            moves={moves}
            newsLockedBefore={newsLockedBefore}
            onPick={pickMove}
            onSelectNews={setOpenNewsId}
            onLogin={promptLogin}
          />
        ),
        supply: (
          <>
            <PanelHeader
              title="투자자별 수급"
              hint="외국인·기관·개인 순매수 수량"
              actions={<ChipGroup options={SUPPLY_RANGES} value={supplyRange} onChange={setSupplyRange} />}
            />
            {supply.length > 0 ? (
              <SupplyDemandCharts key={supplyRange} points={supply} />
            ) : (
              <p className="py-10 text-center text-body text-muted-foreground">수급 데이터가 없습니다.</p>
            )}
          </>
        ),
        financials: (
          <div className="flex flex-col gap-8">
            <StockMetricsCard stock={stock} financials={financialRows} flows={flowRes} />
            <div>
              <PanelHeader
                title="연간 실적"
                actions={<ChipGroup options={ANNUAL_PERIODS} value={annualPeriod} onChange={setAnnualPeriod} />}
              />
              {annualRows.length > 0 ? (
                <AnnualCharts key={`${code}-${annualPeriod}`} rows={annualRows} />
              ) : (
                <p className="py-10 text-center text-body text-muted-foreground">연간 실적 데이터가 없습니다.</p>
              )}
            </div>
            <div>
              <PanelHeader title="재무 지표 요약" />
              {financialRows && financialRows.length > 0 ? (
                <FinancialTable rows={financialRows} />
              ) : (
                <p className="py-10 text-center text-body text-muted-foreground">재무 데이터가 없습니다.</p>
              )}
            </div>
          </div>
        ),
        disclosures: (
          <ContractSection
            key={code}
            data={contracts.data}
            loading={contracts.loading}
            error={contracts.error}
            onRetry={contracts.refetch}
            referenceDate={referenceDate}
            from={pathname}
            limit={CONTRACT_PREVIEW}
            className="mb-3"
          />
        ),
        company: (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-5">
              {stock.description || overviewRows.length > 0 ? (
                <CompanyOverview
                  description={stock.description}
                  source={stock.descriptionSource}
                  rceptNo={stock.descriptionRceptNo}
                  rows={overviewRows}
                />
              ) : (
                <p className="text-body text-muted-foreground">아직 기업 개요가 없습니다.</p>
              )}
              <RailCard title="지식그래프">
                <p className="mb-3 text-caption leading-relaxed text-muted-foreground break-keep">
                  공급·투자 관계로 연결된 기업, 소속 테마, 관련 이벤트를 그래프로 봅니다.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/graph/${stock.ticker}`}>지식그래프에서 보기</Link>
                </Button>
              </RailCard>
            </div>
            <ThemePeerComparison stock={stock} />
          </div>
        ),
      }
    : { reason: null, supply: null, financials: null, disclosures: null, company: null }

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
              to={themePath(stock.themeId)}
              state={fromState(pathname)}
              className="text-caption text-muted-foreground hover:text-primary hover:underline"
            >
              {stock.themeName}
            </Link>
          </>
        )}
      </div>

      {loading && <PageSkeleton />}

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
          <StockHeader stock={stock} />

          <StockOverviewLayout
            chart={
              <div ref={chartRef} className="scroll-mt-24">
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
                  <div className="h-96 animate-pulse rounded-3xl bg-muted motion-reduce:animate-none" />
                )}
              </div>
            }
            issues={
              issues.length > 0 ? (
                <section aria-label="이슈 타임라인">
                  <IssueNewsPanel
                    days={issues}
                    selectedIndex={selectedIndex}
                    onSelectNews={setOpenNewsId}
                    onClearSelection={clearSelection}
                  />
                </section>
              ) : null
            }
            stats={<StockStatGrid stock={stock} />}
            trading={null}
            signals={
              signals.length > 0 ? (
                <RailCard title="수급 신호" aside="외국인·기관 연속 매매">
                  <div className="flex flex-wrap gap-1.5">{signals}</div>
                </RailCard>
              ) : null
            }
            ranks={<ThemePeerRanks stock={stock} />}
          />

          <StockSectionTabs
            stock={stock}
            value={tab}
            onChange={setTab}
            counts={{ disclosures: contracts.data?.length }}
          >
            {panels[tab]}
          </StockSectionTabs>
        </>
      )}

      <NewsDetailModal newsId={openNewsId} onOpenChange={(open) => !open && setOpenNewsId(null)} />

      <DataNotice className="mt-8" />
    </div>
  )
}
