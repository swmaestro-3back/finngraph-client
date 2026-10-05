import type { ReactNode, Ref } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { GapValue } from '@/components/fg/Gap'
import { PriceChange } from '@/components/fg/PriceChange'
import { RetryText } from '@/components/fg/RetryText'
import { Skeleton } from '@/components/fg/Skeleton'
import { PriceStatus } from '@/components/fg/StatusTag'
import { StockDetailLink, StockStar, StockThemeChips } from '@/components/fg/StockActions'
import { StockSpark } from '@/components/fg/StockSpark'
import { ThemeIndexRetry } from '@/components/fg/ThemeIndexRetry'
import { Week52Range } from '@/components/fg/Week52Range'
import type { StockRowRes } from '@/lib/apiTypes'
import { formatCompactKrw } from '@/lib/format'
import { marketLabel, toneClass } from '@/lib/fg/format'
import { issuePath } from '@/lib/fg/paths'
import type { HubIssueRef } from '@/lib/fg/hub'
import { FLOW_DAYS, formatManShares, formatRatio, formatTimes, WEEK52_BASIS, type StockSummary } from '@/lib/fg/stockQuote'
import { monthDayLabel } from '@/lib/fg/themeCharts'
import { fromState } from '@/lib/navigation'
import type { HubSlot } from '@/lib/queries/useHubSlots'

interface StatProps {
  label: string
  loading?: boolean
  children: ReactNode
}

function Stat({ label, loading = false, children }: StatProps) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="fg-num">{loading ? <Skeleton width={64} height={24} /> : children}</dd>
    </div>
  )
}

export interface PanelRetry {
  candles: () => void
  flows: () => void
  themeStocks: () => void
}

function TradingStat({ summary, retry }: { summary: StockSummary; retry: PanelRetry }) {
  return (
    <Stat label="거래대금" loading={summary.tradingLoading}>
      {summary.tradingFailed ? (
        <RetryText subject="거래대금" onRetry={retry.themeStocks} />
      ) : (
        formatCompactKrw(summary.tradingValue)
      )}
    </Stat>
  )
}

function ForeignStat({ summary, retry }: { summary: StockSummary; retry: PanelRetry }) {
  return (
    <Stat label="외국인 보유" loading={summary.flowsLoading}>
      {summary.flowsFailed ? (
        <RetryText subject="외국인 보유" onRetry={retry.flows} />
      ) : (
        formatRatio(summary.flows?.foreignRatio ?? null)
      )}
    </Stat>
  )
}

function CandlesFailed({ retry }: { retry: PanelRetry }) {
  return <ThemeIndexRetry message="주가 흐름을 불러오지 못했어요" onRetry={retry.candles} />
}

function StockFlows({ summary, retry }: { summary: StockSummary; retry: PanelRetry }) {
  const flows = summary.flows
  const days = flows ? Math.min(flows.days, FLOW_DAYS) : FLOW_DAYS
  const year = flows ? Number(flows.to.slice(0, 4)) : 0
  const items: readonly [string, number | null][] = flows
    ? [
        ['외국인', flows.foreign],
        ['기관', flows.institution],
        ['개인', flows.individual],
      ]
    : []
  return (
    <div className="fg-tdet__sec">
      <span className="fg-tdet__label fg-sdet__row">
        <span>최근 {days}일 투자자별 순매수</span>
        <span>단위 만 주</span>
      </span>
      {summary.flowsFailed ? (
        <ThemeIndexRetry message="투자자별 매매를 불러오지 못했어요" onRetry={retry.flows} />
      ) : summary.flowsLoading ? (
        <Skeleton height={41} />
      ) : flows ? (
        <dl
          className="fg-sdet__flows"
          title={`${monthDayLabel(flows.from, year)} ~ ${monthDayLabel(flows.to, year)} 합계`}
        >
          {items.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd className={value === null ? undefined : toneClass(value)}>
                {value === null ? '—' : formatManShares(value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="fg-tdet__none">투자자별 매매 기록이 없어요</p>
      )}
    </div>
  )
}

export type IssueLineSlot = HubSlot<HubIssueRef | null>

function StockIssue({ line }: { line: IssueLineSlot }) {
  const { pathname, search } = useLocation()
  let body: ReactNode
  if (line.status === 'not-ready') {
    body = <GapValue gap={line.gap} label="준비 중이에요" className="fg-tdet__none" />
  } else if (line.status === 'loading') {
    body = <Skeleton height={44} />
  } else if (line.status === 'error') {
    body = (
      <p className="fg-tdet__none">
        이슈를 불러오지 못했어요 <RetryText subject="관련 이슈" onRetry={line.retry} />
      </p>
    )
  } else if (line.data) {
    body = (
      <Link to={issuePath(line.data.id)} state={fromState(`${pathname}${search}`)} className="fg-tdet__issue">
        <i className="fg-dia" aria-hidden="true" />
        <span>
          <b>{line.data.title}</b>
          <small>{line.data.media}개 매체 보도 · 최근 이 종목이 나온 이슈</small>
        </span>
      </Link>
    )
  } else {
    body = <p className="fg-tdet__none">최근 30일 동안 이 종목이 나온 이슈가 없어요</p>
  }
  return (
    <div className="fg-tdet__sec">
      <span className="fg-sdet__label">
        <span className="fg-tdet__label">관련 이슈</span>
      </span>
      {body}
    </div>
  )
}

interface StockPanelProps {
  stock: StockRowRes
  summary: StockSummary
  issue: IssueLineSlot
  today: string
  retry: PanelRetry
  ref?: Ref<HTMLElement>
}

function PanelPrice({ stock, summary }: { stock: StockRowRes; summary: StockSummary }) {
  if (stock.price !== null && summary.status)
    return <PriceStatus price={stock.price} status={summary.status} display className="fg-sdet__price" />
  if (stock.price === null || stock.change === null)
    return (
      <span className="fg-sdet__price fg-price">
        <span className="fg-price__now fg-price__now--display">—</span>
      </span>
    )
  return <PriceChange price={stock.price} change={stock.change} amount={summary.amount} display className="fg-sdet__price" />
}

export function StockPanel({ stock, summary, issue, today, retry, ref }: StockPanelProps) {
  const week52 = summary.week52
  return (
    <section ref={ref} className="fg-section fg-sdet fg-rail__wide fg-reveal" aria-labelledby="fg-sdet-name">
      <div className="fg-sdet__body">
        <div className="fg-sdet__id">
          <CompanyLogo name={stock.name} size={40} />
          <div className="fg-sdet__who">
            <h2 id="fg-sdet-name" className="fg-tdet__name">
              {stock.name}
            </h2>
            <span className="fg-sdet__meta">
              <Badge>{marketLabel(stock.market)}</Badge>
              <span className="fg-sdet__code fg-num">{stock.ticker}</span>
            </span>
          </div>
          <StockStar stock={stock} className="fg-tdet__star fg-sdet__star" />
        </div>
        <PanelPrice stock={stock} summary={summary} />
        {summary.candlesFailed ? (
          <CandlesFailed retry={retry} />
        ) : (
          <StockSpark spark={summary.spark} loading={summary.loading} />
        )}
        {summary.loading && week52 === null ? (
          <Skeleton height={97} />
        ) : (
          week52 &&
          stock.price !== null && (
            <Week52Range
              className="fg-sdet__w52"
              name={stock.name}
              price={stock.price}
              high={week52.range.high}
              low={week52.range.low}
              basis={WEEK52_BASIS}
              asOf={week52.asOf}
              today={today}
              state={week52.state}
              highDate={week52.range.highDate}
              lowDate={week52.range.lowDate}
            />
          )
        )}
        <dl className="fg-tdet__stats">
          <Stat label="시가총액">{formatCompactKrw(stock.marketCap)}</Stat>
          <TradingStat summary={summary} retry={retry} />
          <Stat label="PER">{formatTimes(stock.per)}</Stat>
          <Stat label="PBR">{formatTimes(stock.pbr)}</Stat>
          <Stat label="배당수익률">{formatRatio(stock.dividendYield)}</Stat>
          <ForeignStat summary={summary} retry={retry} />
        </dl>
        <StockFlows summary={summary} retry={retry} />
        <StockThemeChips stock={stock} />
        <StockIssue line={issue} />
      </div>
      <div className="fg-sdet__foot">
        <StockDetailLink stock={stock} />
      </div>
    </section>
  )
}

export function StockFold({ stock, summary, retry }: { stock: StockRowRes; summary: StockSummary; retry: PanelRetry }) {
  return (
    <div className="fg-sfold">
      {summary.candlesFailed ? (
        <CandlesFailed retry={retry} />
      ) : (
        <StockSpark spark={summary.spark} loading={summary.loading} />
      )}
      <dl className="fg-tdet__stats">
        <Stat label="시가총액">{formatCompactKrw(stock.marketCap)}</Stat>
        <Stat label="PER">{formatTimes(stock.per)}</Stat>
        <TradingStat summary={summary} retry={retry} />
        <ForeignStat summary={summary} retry={retry} />
      </dl>
      <StockThemeChips stock={stock} className="fg-sfold__sec" />
      <div className="fg-sfold__acts">
        <StockStar stock={stock} className="fg-sfold__star" />
        <StockDetailLink stock={stock} />
      </div>
    </div>
  )
}
