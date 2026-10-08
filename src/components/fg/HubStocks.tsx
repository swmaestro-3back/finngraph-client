import { useCallback, useMemo, type ReactNode } from 'react'
import { Badge } from '@/components/fg/Badge'
import { Button, ButtonLink } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { GapValue, MockBadge } from '@/components/fg/Gap'
import { MemberGate } from '@/components/fg/MemberGate'
import { ChangeText } from '@/components/fg/PriceChange'
import { RetryText } from '@/components/fg/RetryText'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { ThemeIndexRetry } from '@/components/fg/ThemeIndexRetry'
import {
  HubBody,
  HubFrame,
  HubInline,
  HubItem,
  HubMore,
  HubPanel,
  HubQuoteRow,
  HubSoon,
  HubTimeline,
  HubTimelineSkeleton,
  type HubTabProps,
} from '@/components/fg/TimelineHub'
import type { StockRowRes } from '@/lib/apiTypes'
import { useRefreshTick } from '@/lib/autoRefresh'
import { formatCompactKrw } from '@/lib/format'
import { formatGapPct, formatPriceWon, marketLabel } from '@/lib/fg/format'
import {
  flowLabels,
  HUB_INFERRED,
  HUB_STOCK_LIMIT,
  hubCaption,
  pickMovers,
  splitTimeline,
  type HubIssueRef,
} from '@/lib/fg/hub'
import { linkedPreview } from '@/lib/fg/linkedCompanies'
import { stockPath } from '@/lib/fg/paths'
import { hasQuote } from '@/lib/fg/stockLinks'
import { STOCK_ISSUE_ORDER } from '@/lib/fg/stockIssues'
import { QUOTE_CANDLE_LIMIT, stockSummary, WEEK52_BASIS, week52Of, type StockSummary } from '@/lib/fg/stockQuote'
import { useDelayed } from '@/lib/fg/useDelayed'
import { useHubSelection, useSeen } from '@/lib/fg/useHub'
import { Week52Range } from '@/components/fg/Week52Range'
import { josa } from '@/lib/josa'
import { useMemberGate } from '@/lib/memberGate'
import { fromState } from '@/lib/navigation'
import { fetchCandles } from '@/lib/queries/useCandles'
import { useStockIssueLines, useStockTimeline, type HubSlot } from '@/lib/queries/useHubSlots'
import { useKeyed } from '@/lib/queries/useKeyed'
import { useLinkedCompanies } from '@/lib/queries/useLinkedCompanies'
import { useStocksCached } from '@/lib/queries/useStocksCached'
import { fetchThemeStocks } from '@/lib/queries/useThemeStocks'
import { cn } from '@/lib/utils'

const HEADING = '움직인 종목에서 이슈 찾기'
const LIST_LABEL = '많이 움직인 종목, 등락률이 큰 순'
const LINES_FAILED = '최근 이슈를 불러오지 못했어요'

type Lines = HubSlot<ReadonlyMap<string, HubIssueRef | null>>

function subLabel(stock: StockRowRes): string {
  return [marketLabel(stock.market), stock.themeName].filter(Boolean).join(' · ')
}

interface StockHeadProps {
  stock: StockRowRes
  open: boolean
  line: HubIssueRef | null
  flow: ReactNode
  high: boolean
}

function StockHead({ stock, open, line, flow, high }: StockHeadProps) {
  return (
    <>
      <span className="fg-hh">
        <span className="fg-hh__who">
          <span className="fg-lg">
            <CompanyLogo name={stock.name} size={open ? 32 : 24} />
            <span className="fg-hh__name">{stock.name}</span>
          </span>
          <span className="fg-hh__sub">{subLabel(stock)}</span>
          {open && high && <Badge tone="high">52주 신고가</Badge>}
        </span>
        {open
          ? flow && <span className="fg-hh__flow">{flow}</span>
          : line && (
              <span className="fg-hh__issue">
                <i className="fg-dia" aria-hidden="true" />
                <span className="fg-hh__itext">{line.title}</span>
                <span className="fg-hh__media fg-num">{`${line.media}개 매체`}</span>
              </span>
            )}
      </span>
      <span className="fg-hh__px fg-num">
        {stock.price !== null && <span className="fg-hh__price">{formatPriceWon(stock.price)}</span>}
        {stock.change !== null && <ChangeText value={stock.change} className="fg-hh__chg" />}
      </span>
    </>
  )
}

function StockFlowText({ ticker }: { ticker: string }) {
  const timeline = useStockTimeline(ticker)
  if (timeline.status !== 'ready' || timeline.data.flow === null) return null
  const labels = flowLabels(timeline.data.flow)
  return <GapValue gap="stock-issues" mock={`${labels.count} · ${labels.since}`} />
}

interface StockBodyProps {
  stock: StockRowRes
  today: string
  from: string
  pane: ReactNode
}

function StockBody({ stock, today, from, pane }: StockBodyProps) {
  const timeline = useStockTimeline(stock.ticker)
  const subject = `${stock.name}${josa(stock.name, '이/가')}`
  const state = fromState(from)
  let content: ReactNode
  if (timeline.status === 'not-ready') {
    content = <HubSoon gap={timeline.gap} text="이 종목이 나온 이슈는 준비 중이에요" />
  } else if (timeline.status === 'loading') {
    content = <HubTimelineSkeleton />
  } else if (timeline.status === 'error') {
    content = (
      <p className="fg-hubsoon">
        <span>이슈를 불러오지 못했어요</span>
        <RetryText subject="이슈" onRetry={timeline.retry} />
      </p>
    )
  } else {
    const split = splitTimeline(timeline.data.nodes)
    content = split ? (
      <HubTimeline
        label={`${stock.name} 이슈 타임라인, ${STOCK_ISSUE_ORDER}`}
        today={today}
        current={split.current}
        past={split.past}
        showTitle
        size="md"
        linkState={state}
      />
    ) : (
      <p className="fg-hubsoon">최근 이 종목이 나온 이슈가 없어요</p>
    )
  }
  return (
    <>
      <div className="fg-hubsec">
        <span className="fg-hubsec__title">
          {`${stock.name}의 주요 이슈`}
          {timeline.status === 'ready' && timeline.mock && <MockBadge />}
        </span>
        <span className="fg-hubsec__cap">{`${subject} 나온 이슈를 ${STOCK_ISSUE_ORDER}으로 이었어요`}</span>
      </div>
      {content}
      <HubMore to={`${stockPath(stock.ticker)}?tab=news`} state={state}>
        타임라인 전체 보기
      </HubMore>
      {pane && <HubInline>{pane}</HubInline>}
    </>
  )
}

interface PaneRetry {
  candles: () => void
  themeStocks: () => void
}

interface StockPaneProps {
  stock: StockRowRes
  summary: StockSummary
  retry: PaneRetry
  baseDate: string | null
  basisShort: string | null
  today: string
  from: string
}

function StockPane({ stock, summary, retry, baseDate, basisShort, today, from }: StockPaneProps) {
  const { locked, pending } = useMemberGate()
  const linked = useLinkedCompanies(stock.ticker, stock.name, baseDate)
  const preview = linked.list ? linkedPreview(linked.list, HUB_INFERRED) : null
  const week52 = summary.week52
  const state = fromState(from)
  const linksTo = `${stockPath(stock.ticker)}?tab=links`
  let range: ReactNode = null
  if (summary.loading && week52 === null) {
    range = <Skeleton height={76} />
  } else if (summary.candlesFailed && week52 === null) {
    range = <ThemeIndexRetry message="52주 범위를 불러오지 못했어요" onRetry={retry.candles} className="fg-hubp__retry" />
  } else if (week52 && stock.price !== null) {
    range = (
      <Week52Range
        className="fg-hubp__w52"
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
  }
  let trading: ReactNode
  if (summary.tradingFailed) trading = <RetryText subject="거래대금" onRetry={retry.themeStocks} />
  else if (summary.tradingLoading) trading = <Skeleton width={64} height={24} />
  else trading = formatCompactKrw(summary.tradingValue)
  let linkedBody: ReactNode
  if (linked.error && !preview) {
    linkedBody = (
      <p className="fg-hubsoon" role="status">
        <span>이어진 종목을 불러오지 못했어요</span>
        <RetryText subject="이어진 종목" onRetry={linked.retry} />
      </p>
    )
  } else if (!preview || pending) {
    linkedBody = <Skeleton height={96} />
  } else if (preview.total === 0) {
    linkedBody = <p className="fg-hubp__empty">아직 이어진 종목이 없어요</p>
  } else if (locked) {
    linkedBody = <MemberGate subject={`이어진 종목 ${preview.total}곳`} variant="compact" className="fg-hubp__gate" />
  } else {
    linkedBody = (
      <div className="fg-hubp__rows">
        {preview.rows.map((company) => (
          <HubQuoteRow
            key={company.id}
            to={linksTo}
            state={state}
            name={company.name}
            market={company.market}
            price={company.price}
            change={company.change}
          >
            <span className="fg-hq__foot">
              <span className="fg-qrow__rel">{`AI 추론 · ${company.relation}`}</span>
              {hasQuote(company) && (
                <span className="fg-hq__gap fg-num">
                  {company.newHigh ? (
                    <>
                      52주 최고 <b>경신</b>
                    </>
                  ) : (
                    <>
                      52주 최고 대비 <b>{company.gapFromHigh === null ? '—' : formatGapPct(company.gapFromHigh)}</b>
                    </>
                  )}
                </span>
              )}
            </span>
          </HubQuoteRow>
        ))}
      </div>
    )
  }
  return (
    <>
      <div className="fg-hubp__head">
        <span className="fg-hubp__title">{`${stock.name} 핵심 주가`}</span>
        {basisShort && <span className="fg-hubp__cap">{basisShort}</span>}
      </div>
      {range}
      <dl className="fg-hubp__tiles">
        <div>
          <dt>거래대금</dt>
          <dd className="fg-num">{trading}</dd>
        </div>
        <div>
          <dt>시가총액</dt>
          <dd className="fg-num">{formatCompactKrw(stock.marketCap)}</dd>
        </div>
      </dl>
      <div className="fg-hubp__inf">
        <span className="fg-hubp__label">
          <span>같은 이슈로 이어진 종목</span>
        </span>
        {linkedBody}
      </div>
      <div className="fg-hubp__acts">
        <ButtonLink to={stockPath(stock.ticker)} state={state}>{`${stock.name} 종목 보기`}</ButtonLink>
        <ButtonLink to={`${stockPath(stock.ticker)}?tab=news`} state={state}>
          타임라인 전체 보기
        </ButtonLink>
      </div>
    </>
  )
}

function lineOf(lines: Lines, ticker: string): HubIssueRef | null {
  return lines.status === 'ready' ? (lines.data.get(ticker) ?? null) : null
}

export function HubStocks({ layout, tabs, basis, basisShort, market, pick, onPick, today, from, refreshKey }: HubTabProps) {
  const wide = layout === 'wide'
  const stocks = useStocksCached()
  const movers = useMemo(() => (stocks.data ? pickMovers(stocks.data) : null), [stocks.data])
  const keys = useMemo(() => (movers ?? []).map((stock) => stock.ticker), [movers])
  const selected = useHubSelection(keys, pick, movers !== null, onPick)
  const stock = movers?.find((row) => row.ticker === selected) ?? null
  const lines = useStockIssueLines(keys)
  const seen = useSeen(selected)

  const baseDate = market?.baseDate ?? null
  const needCandles = stock !== null && week52Of(stock) === null
  const candles = useKeyed(needCandles ? stock.ticker : null, (ticker) => fetchCandles(ticker, 'D', QUOTE_CANDLE_LIMIT))
  const themeStocks = useKeyed(stock && stock.tradeValue === undefined ? stock.themeId : null, fetchThemeStocks)
  const summary = useMemo(
    () =>
      stock
        ? stockSummary({
            ticker: stock.ticker,
            price: stock.price,
            change: stock.change,
            amount: stock.changeAmount,
            candles: !needCandles ? [] : candles.loading ? null : (candles.data ?? []),
            flows: [],
            themeStocks: stock.themeId === null ? [] : themeStocks.loading ? null : (themeStocks.data ?? []),
            failed: { candles: candles.error !== null, themeStocks: themeStocks.error !== null },
            quote: stock,
            basisDate: baseDate,
          })
        : null,
    [stock, needCandles, baseDate, candles.loading, candles.data, candles.error, themeStocks.loading, themeStocks.data, themeStocks.error],
  )
  const { refresh: refreshCandles, retry: retryCandles } = candles
  const { refresh: refreshThemeStocks, retry: retryThemeStocks } = themeStocks
  const refresh = useCallback(() => {
    refreshCandles()
    refreshThemeStocks()
  }, [refreshCandles, refreshThemeStocks])
  useRefreshTick(refreshKey, refresh)
  const retry = useMemo(() => ({ candles: retryCandles, themeStocks: retryThemeStocks }), [retryCandles, retryThemeStocks])
  const skeleton = useDelayed(movers === null && !stocks.error)

  const caption = layout === 'mobile' && basis ? `${hubCaption('stocks', { day: null, autoSec: null })} · ${basis}` : hubCaption('stocks', { day: null, autoSec: null })

  let body: ReactNode
  if (stocks.error && movers === null) {
    body = (
      <StateBlock
        kind="error"
        title="데이터를 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
        action={
          <Button size="sm" onClick={stocks.refetch}>
            다시 시도
          </Button>
        }
      />
    )
  } else if (movers === null) {
    body = skeleton ? (
      <div className={cn('fg-hubskel', wide && 'fg-hubskel--wide')} aria-hidden="true">
        <div className="fg-hubskel__list">
          {Array.from({ length: HUB_STOCK_LIMIT }, (_, i) => (
            <Skeleton key={i} height={72} />
          ))}
        </div>
        {wide && <Skeleton height={360} shape="card" />}
      </div>
    ) : (
      <div className="fg-hubskel" />
    )
  } else if (movers.length === 0 || stock === null || summary === null) {
    body = <StateBlock kind="empty" title="오늘 움직인 종목이 아직 없어요" description="시세가 들어오면 여기에 보여 드려요" />
  } else {
    const pane = (
      <StockPane
        key={stock.ticker}
        stock={stock}
        summary={summary}
        retry={retry}
        baseDate={baseDate}
        basisShort={basisShort}
        today={today}
        from={from}
      />
    )
    const high = summary.week52?.state === 'high'
    body = (
      <HubBody
        layout={layout}
        listLabel={LIST_LABEL}
        items={movers.map((row) => {
          const open = row.ticker === selected
          return (
            <HubItem
              key={row.ticker}
              open={open}
              bodyId={`fg-hub-stock-${row.ticker}`}
              head={
                <StockHead
                  stock={row}
                  open={open}
                  line={lineOf(lines, row.ticker)}
                  flow={open ? <StockFlowText ticker={row.ticker} /> : null}
                  high={open && high}
                />
              }
              onPick={() => onPick(row.ticker)}
            >
              {seen.has(row.ticker) && (
                <StockBody stock={row} today={today} from={from} pane={!wide && open ? pane : null} />
              )}
            </HubItem>
          )
        })}
        panel={
          <HubPanel label={`${stock.name} 핵심 주가`} paneKey={stock.ticker} live="polite">
            {pane}
          </HubPanel>
        }
      />
    )
  }

  return (
    <HubFrame heading={HEADING} tab="stocks" tabs={tabs} basis={basis} caption={caption} layout={layout}>
      {body}
      {lines.status === 'error' && movers !== null && movers.length > 0 && (
        <p className="fg-hubc__fail" role="status">
          <span>{LINES_FAILED}</span>
          <RetryText subject="최근 이슈" onRetry={lines.retry} />
        </p>
      )}
    </HubFrame>
  )
}
