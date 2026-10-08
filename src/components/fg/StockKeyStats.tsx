import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { GapValue } from '@/components/fg/Gap'
import { RetryText } from '@/components/fg/RetryText'
import { Skeleton } from '@/components/fg/Skeleton'
import { ThemeIndexRetry } from '@/components/fg/ThemeIndexRetry'
import type { PeerMetricRes, StockDetailRes, StockThemeCompareRes } from '@/lib/apiTypes'
import { formatCompactKrw } from '@/lib/format'
import { capRankLabel, navState, stockTabSearch, type CapRank } from '@/lib/fg/stockDetail'
import { formatRatio, formatTimes } from '@/lib/fg/stockQuote'
import { monthDayLabel } from '@/lib/fg/themeCharts'

interface StatProps {
  label: string
  value: ReactNode
  note?: ReactNode
  loading?: boolean
}

function Stat({ label, value, note, loading = false }: StatProps) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="fg-num">{loading ? <Skeleton width={72} height={24} /> : value}</dd>
      {note !== undefined && note !== null && <small className="fg-num">{note}</small>}
    </div>
  )
}

type Retry = (() => void) | null

export interface KeyStatsFailed {
  trading: Retry
  rank: Retry
  compare: Retry
  streaks: Retry
}

interface StockKeyStatsProps {
  stock: StockDetailRes
  tradingValue: number | null
  tradingLoading: boolean
  tradingRatio: number | null
  capRank: CapRank | null
  compare: StockThemeCompareRes | null
  streaks: readonly string[]
  failed: KeyStatsFailed
}

export function StockKeyStats({
  stock,
  tradingValue,
  tradingLoading,
  tradingRatio,
  capRank,
  compare,
  streaks,
  failed,
}: StockKeyStatsProps) {
  const { pathname, search, state } = useLocation()
  const metrics = failed.compare ? null : (compare?.metrics ?? null)
  const basisDate = compare?.valuationDate ?? compare?.baseDate ?? stock.valuationDate ?? stock.baseDate ?? null
  const versus = (metric: PeerMetricRes | null, format: (value: number) => string) =>
    metric && metric.median !== null ? `테마 ${format(metric.median)}` : null
  return (
    <section className="fg-section fg-sks" aria-labelledby="fg-sks-title">
      <h2 id="fg-sks-title" className="fg-section__title">
        핵심 지표
      </h2>
      <dl className="fg-ks">
        <Stat
          label="시가총액"
          value={formatCompactKrw(stock.marketCap)}
          note={
            failed.rank ? <RetryText subject="시장 순위" onRetry={failed.rank} /> : capRank ? capRankLabel(capRank) : null
          }
        />
        <Stat
          label="거래대금"
          value={failed.trading ? <RetryText subject="거래대금" onRetry={failed.trading} /> : formatCompactKrw(tradingValue)}
          loading={tradingLoading}
          note={
            tradingRatio === null ? null : <GapValue gap="stock-quote-ext" mock={`평소의 ${tradingRatio.toFixed(1)}배`} />
          }
        />
        <Stat
          label="PER"
          value={formatTimes(stock.per)}
          note={versus(metrics?.per ?? null, formatTimes)}
        />
        <Stat
          label="PBR"
          value={formatTimes(stock.pbr)}
          note={versus(metrics?.pbr ?? null, formatTimes)}
        />
        <Stat
          label="ROE"
          value={formatRatio(stock.roe)}
          note={versus(metrics?.roe ?? null, formatRatio)}
        />
        <Stat
          label="배당수익률"
          value={formatRatio(stock.dividendYield)}
          note={versus(metrics?.dividendYield ?? null, formatRatio)}
        />
      </dl>
      {failed.streaks ? (
        <ThemeIndexRetry message="수급 연속 배지를 불러오지 못했어요" onRetry={failed.streaks} />
      ) : (
        streaks.length > 0 && (
          <div className="fg-sks__badges">
            {streaks.map((label) => (
              <Badge key={label}>{label}</Badge>
            ))}
          </div>
        )
      )}
      {failed.compare && (
        <ThemeIndexRetry message="테마 비교를 불러오지 못했어요" onRetry={failed.compare} />
      )}
      {!failed.compare && compare && (
        <span className="fg-sks__cap">
          {metrics && Object.values(metrics).some((metric) => metric.median !== null)
            ? `‘테마’는 ${compare.themeName} ${compare.memberCount}종목의 중앙값이에요 · 값이 없는 종목은 빼고 셌어요`
            : `${compare.themeName} ${compare.memberCount}종목은 견줄 종목이 적어 중앙값을 보이지 않아요`}
          {basisDate && ` · ${monthDayLabel(basisDate, Number(basisDate.slice(0, 4)))} 기준`}
        </span>
      )}
      <Link
        to={{ pathname, search: stockTabSearch(search, 'finance') }}
        state={navState(state)}
        replace
        className="fg-sdmore"
      >
        재무·수급 자세히
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
      </Link>
    </section>
  )
}
