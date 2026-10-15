import { ChevronRight } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { RetryText } from '@/components/fg/RetryText'
import { Skeleton } from '@/components/fg/Skeleton'
import { ThemeIndexRetry } from '@/components/fg/ThemeIndexRetry'
import type { PeerMetricRes, StockDetailRes, StockThemeCompareRes } from '@/lib/apiTypes'
import { formatCompactKrw } from '@/lib/format'
import { capRankLabel, navState, stockTabSearch, type CapRank } from '@/lib/fg/stockDetail'
import { formatRatio, formatTimes } from '@/lib/fg/stockQuote'
import { monthDayLabel } from '@/lib/fg/themeCharts'
import { volumeRatioNote } from '@/lib/fg/themeDetail'

const RATIO_BASIS = '거래대금 ‘평소’는 직전 20거래일 평균이에요'

interface StatProps {
  label: string
  sub?: string
  value: ReactNode
  note?: ReactNode
  loading?: boolean
}

const STREAK_DAYS = /(\d+일 연속)/

function StreakText({ label }: { label: string }) {
  return label.split(STREAK_DAYS).map((part, i) => (i % 2 === 1 ? <b key={i}>{part}</b> : part))
}

function Stat({ label, sub, value, note, loading = false }: StatProps) {
  return (
    <div>
      <dt>
        {label}
        {sub && <small className="fg-ks__sub">{sub}</small>}
      </dt>
      <dd className="fg-num">{loading ? <Skeleton width={72} height={24} /> : value}</dd>
      {note !== undefined && note !== null && <small className="fg-ks__note fg-num">{note}</small>}
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
          note={volumeRatioNote(tradingRatio)}
        />
        <Stat
          label="PER"
          sub="주가수익비율"
          value={formatTimes(stock.per)}
          note={versus(metrics?.per ?? null, formatTimes)}
        />
        <Stat
          label="PBR"
          sub="주가순자산비율"
          value={formatTimes(stock.pbr)}
          note={versus(metrics?.pbr ?? null, formatTimes)}
        />
        <Stat
          label="ROE"
          sub="자기자본이익률"
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
          <p className="fg-sks__flow fg-num">
            {streaks.map((label, i) => (
              <Fragment key={label}>
                {i > 0 && ' · '}
                <StreakText label={label} />
              </Fragment>
            ))}
          </p>
        )
      )}
      {failed.compare && (
        <ThemeIndexRetry message="테마 비교를 불러오지 못했어요" onRetry={failed.compare} />
      )}
      {((!failed.compare && compare) || tradingRatio !== null) && (
        <span className="fg-sks__cap">
          {!failed.compare && compare && (
            <>
              {metrics && Object.values(metrics).some((metric) => metric.median !== null)
                ? `‘테마’는 ${compare.themeName} ${compare.memberCount}종목의 중앙값이에요 · 값이 없는 종목은 빼고 셌어요`
                : `${compare.themeName} ${compare.memberCount}종목은 견줄 종목이 적어 중앙값을 보이지 않아요`}
              {basisDate && ` · ${monthDayLabel(basisDate, Number(basisDate.slice(0, 4)))} 기준`}
              {tradingRatio !== null && ' · '}
            </>
          )}
          {tradingRatio !== null && RATIO_BASIS}
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
