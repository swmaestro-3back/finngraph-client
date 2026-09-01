import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronUp, CircleAlert, RotateCw } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { AnnualCharts } from '@/components/stock/AnnualCharts'
import { FinancialTable } from '@/components/stock/FinancialTable'
import { NewsDetailModal } from '@/components/news/NewsDetailModal'
import { IssueNewsPanel } from '@/components/stock/IssueNewsPanel'
import { PriceIssueCard } from '@/components/stock/PriceIssueCard'
import { SupplyDemandCharts } from '@/components/stock/SupplyDemandCharts'
import { Button } from '@/components/ui/button'
import { buildIssueTimeline, toCandleDates, toCandleView, toSupplyPoint } from '@/lib/apiMappers'
import { CANDLE_COUNTS, type CandlePeriod } from '@/lib/apiTypes'
import {
  changeColorClass,
  formatAmountOrDash,
  formatChange,
  formatChangeOrDash,
  formatPriceOrDash,
  toEok,
} from '@/lib/format'
import { fromState, useBackTarget } from '@/lib/navigation'
import { useCandles } from '@/lib/queries/useCandles'
import { useFinancials } from '@/lib/queries/useFinancials'
import { useInvestorFlows } from '@/lib/queries/useInvestorFlows'
import { useStockDetail } from '@/lib/queries/useStockDetail'
import { useStockNews } from '@/lib/queries/useStockNews'
import { cn } from '@/lib/utils'

interface StatTile {
  label: string
  value: string
}

export default function StockDetailPage() {
  const { stockCode } = useParams()
  const code = stockCode ?? ''
  const { pathname } = useLocation()
  const back = useBackTarget({ to: '/stocks', label: '주식 목록' })
  const [period, setPeriod] = useState<CandlePeriod>('D')
  const [annualOpen, setAnnualOpen] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(CANDLE_COUNTS.D - 1)
  const [openNewsId, setOpenNewsId] = useState<string | null>(null)

  const { data: stock, loading, error, refetch } = useStockDetail(code)
  const { data: candleRes } = useCandles(code, period)
  const { data: flowRes } = useInvestorFlows(code)
  const { data: financialRows } = useFinancials(code)
  const { data: newsRows } = useStockNews(code)

  const candles = useMemo(
    () => (candleRes ?? []).map((c) => toCandleView(c, period)),
    [candleRes, period],
  )
  const issues = useMemo(
    () =>
      candleRes && candleRes.length > 0
        ? buildIssueTimeline(newsRows ?? [], toCandleDates(candleRes, period), period)
        : [],
    [candleRes, newsRows, period],
  )
  const supply = useMemo(() => (flowRes ?? []).map(toSupplyPoint), [flowRes])

  const statTiles: StatTile[] = useMemo(() => {
    if (!stock) return []
    return [
      { label: '시가총액', value: `${formatAmountOrDash(toEok(stock.marketCap))}억` },
      { label: 'PER', value: stock.per === null ? '—' : `${stock.per.toFixed(2)}배` },
      { label: 'PBR', value: stock.pbr === null ? '—' : stock.pbr.toFixed(2) },
      { label: 'ROE', value: stock.roe === null ? '—' : `${stock.roe.toFixed(2)}%` },
      {
        label: 'EPS',
        value: stock.eps === null ? '—' : `${Math.round(stock.eps).toLocaleString('ko-KR')}원`,
      },
      {
        label: '배당수익률',
        value: stock.dividendYield === null ? '—' : `${stock.dividendYield.toFixed(2)}%`,
      },
      {
        label: '외국인 보유율',
        value: stock.foreignRatio === null ? '—' : `${stock.foreignRatio.toFixed(1)}%`,
      },
      {
        label: '전년 대비 매출',
        value: stock.revenueGrowth === null ? '—' : formatChange(stock.revenueGrowth),
      },
    ]
  }, [stock])

  useEffect(() => {
    setSelectedIndex(CANDLE_COUNTS[period] - 1)
  }, [period, code])

  const clearSelection = useCallback(() => setSelectedIndex(null), [])

  return (
    <div className="page-container pb-12 pt-7">
      <div className="mb-3 flex items-center gap-[9px]">
        <Link to={back.to} className="text-xs font-semibold leading-none text-primary">
          ← {back.label}
        </Link>
        {stock?.themeName && (
          <>
            <span className="text-caption text-foreground-tertiary">/</span>
            <Link
              to={`/theme/${encodeURIComponent(stock.themeName)}`}
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
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <CircleAlert className="size-8 text-muted-foreground" />
          <h1 className="text-lg font-medium text-foreground">
            {error.isNotFound ? '존재하지 않는 종목입니다' : '일시적인 오류'}
          </h1>
          <p className="text-body text-muted-foreground">
            {error.isNotFound
              ? `"${code}" 종목을 찾을 수 없습니다.`
              : error.isRetryable
                ? '일시적으로 데이터를 불러올 수 없습니다.'
                : '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
          </p>
          {error.isNotFound ? (
            <Button variant="outline" size="sm" asChild>
              <Link to="/stocks">주식 목록으로</Link>
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

      {!loading && !error && stock && (
        <>
          <div className="mb-3 flex flex-wrap items-baseline gap-[9px]">
            <h1 className="text-display font-normal leading-[1.1] tracking-[-0.8px] text-foreground">
              {stock.name}
            </h1>
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
            <Button variant="outline" size="sm" className="ml-auto" asChild>
              <Link to={`/graph/${stock.ticker}`}>지식그래프에서 보기</Link>
            </Button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-[9px] md:grid-cols-4">
            {statTiles.map((tile) => (
              <div key={tile.label} className="rounded-xl bg-muted px-3 py-[9px]">
                <div className="text-caption text-muted-foreground">{tile.label}</div>
                <div className="font-mono text-sm font-medium leading-[1.3] text-foreground">
                  {tile.value}
                </div>
              </div>
            ))}
          </div>

          {candles.length > 0 ? (
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

          <div className="mb-[9px] mt-7 flex items-center gap-2">
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

          <div className="mb-[9px] mt-7 flex items-center gap-2">
            <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">
              투자자별 수급
            </h2>
          </div>
          {supply.length > 0 ? (
            <SupplyDemandCharts points={supply} />
          ) : (
            <p className="text-caption text-muted-foreground">수급 데이터가 없습니다.</p>
          )}

          <div className="mb-[9px] mt-7 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">
                연간 실적
              </h2>
            </div>
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
          {annualOpen &&
            (financialRows && financialRows.length > 0 ? (
              <AnnualCharts rows={financialRows} />
            ) : (
              <p className="text-caption text-muted-foreground">연간 실적 데이터가 없습니다.</p>
            ))}

          <div className="mb-[9px] mt-7 flex items-center gap-2">
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

      <p className="mt-5 text-caption text-muted-foreground">
        표시된 시세·재무·수급 데이터는 데모용 시드 데이터입니다. 투자 판단의 근거로 사용할 수
        없습니다.
      </p>
    </div>
  )
}
