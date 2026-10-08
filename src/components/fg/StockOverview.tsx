import { Lock, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { Button } from '@/components/fg/Button'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { FilterChip } from '@/components/fg/FilterChip'
import { PriceChart, type ChartMarker } from '@/components/fg/PriceChart'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { EventCallout, StockEventList, type EventAction, type EventRow } from '@/components/fg/StockEvents'
import { StockKeyStats } from '@/components/fg/StockKeyStats'
import { StockLinkedRail } from '@/components/fg/StockLinkedRail'
import type { CandleRes, StockDetailRes, ThemeStockRes } from '@/lib/apiTypes'
import { issuePath } from '@/lib/fg/paths'
import { compareThemeId, marketCapRank, STREAK_FLOW_DAYS, streakLabels } from '@/lib/fg/stockDetail'
import {
  issueDayLabel,
  RECENT_ISSUE_COUNT,
  stackMarkers,
  STOCK_ISSUE_ORDER,
  tradingDayLabel,
  type StockIssueEvent,
} from '@/lib/fg/stockIssues'
import { newsDays, newsPage, OVERVIEW_NEWS_PAGE, openNews, opensInModal, type NewsDay } from '@/lib/fg/stockNews'
import { tradingValueOf } from '@/lib/fg/stockQuote'
import { monthDayLabel } from '@/lib/fg/themeCharts'
import { guestStart, toThemeNews, type ThemeNewsItem } from '@/lib/fg/themeNews'
import { useDelayed } from '@/lib/fg/useDelayed'
import { josa } from '@/lib/josa'
import { useMemberGate } from '@/lib/memberGate'
import { fromState } from '@/lib/navigation'
import type { ApiState } from '@/lib/queries/useApi'
import { useInvestorFlows } from '@/lib/queries/useInvestorFlows'
import type { LinkedCompaniesState } from '@/lib/queries/useLinkedCompanies'
import { useStockNews } from '@/lib/queries/useStockNews'
import { useStockThemes, useThemeCompare } from '@/lib/queries/useStockThemes'
import { useStocksCached } from '@/lib/queries/useStocksCached'

const NEWS_GATE_SUBJECT = '지난 뉴스'

interface StockOverviewProps {
  stock: StockDetailRes
  candles: CandleRes[] | null
  candlesFailed: boolean
  onRetryCandles: () => void
  themeStocks: ApiState<ThemeStockRes[]>
  source: EventSource | null
  issues: readonly StockIssueEvent[]
  issueTotal: number
  issueRetry: (() => void) | null
  linked: LinkedCompaniesState
  tradingRatio: number | null
  today: string
  refreshKey: number
  onOpenNews: (id: string) => void
}

export type EventSource = 'issues' | 'news'

interface EventView {
  label: string
  markers: ChartMarker[]
  rows: EventRow[]
  callout: ReactNode
  list: ReactNode
}

function issueAction(issue: StockIssueEvent, from: string): EventAction {
  return { kind: 'route', to: issuePath(issue.id), state: fromState(from) }
}

function newsAction(item: ThemeNewsItem, onOpenNews: (id: string) => void): EventAction {
  return opensInModal(item) ? { kind: 'modal', open: () => onOpenNews(item.id) } : { kind: 'link', url: item.url }
}

export function StockOverview({
  stock,
  candles,
  candlesFailed,
  onRetryCandles,
  themeStocks,
  source,
  issues,
  issueTotal,
  issueRetry,
  linked,
  tradingRatio,
  today,
  refreshKey,
  onOpenNews,
}: StockOverviewProps) {
  const { pathname, search } = useLocation()
  const newsMode = source === 'news'
  const flows = useInvestorFlows(stock.ticker, STREAK_FLOW_DAYS)
  const stocks = useStocksCached()
  const news = useStockNews(newsMode ? stock.ticker : null)
  const { locked, pending, promptLogin } = useMemberGate()
  const [showMarkers, setShowMarkers] = useState(true)
  const [picked, setPicked] = useState<string | null>(null)
  const [dayFilter, setDayFilter] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const stockThemes = useStockThemes(stock.ticker)
  const [pickedTheme, setPickedTheme] = useState<{ ticker: string; id: number } | null>(null)
  const compareTheme = compareThemeId(
    pickedTheme?.ticker === stock.ticker ? pickedTheme.id : null,
    stockThemes.data,
    stock.themeId,
  )
  const compare = useThemeCompare(stock.ticker, compareTheme)

  const { refresh: refreshFlows } = flows
  const { refresh: refreshNews } = news
  const { refresh: refreshCompare } = compare
  useEffect(() => {
    if (refreshKey === 0) return
    refreshFlows()
    refreshNews()
    refreshCompare()
  }, [refreshKey, refreshFlows, refreshNews, refreshCompare])

  const capRank = useMemo(() => (stocks.data ? marketCapRank(stocks.data, stock.ticker) : null), [stocks.data, stock.ticker])
  const streaks = useMemo(
    () => streakLabels(flows.data ?? [], candles?.map((candle) => candle.date)),
    [flows.data, candles],
  )
  const served = stock.tradeValue !== undefined
  const themeLoading = stock.themeId !== null && themeStocks.data === null && themeStocks.error === null
  const themeFailed = stock.themeId !== null && themeStocks.data === null && themeStocks.error !== null
  const stocksFailed = stocks.data === null && stocks.error !== null
  const flowsFailed = flows.data === null && flows.error !== null

  const all = useMemo(() => candles ?? [], [candles])
  const items = useMemo(
    () => (newsMode ? toThemeNews(news.data ?? [], all.map((c) => c.date)) : []),
    [newsMode, news.data, all],
  )
  const openFrom = locked || pending ? guestStart(today) : null
  const opened = useMemo(() => openNews(items, openFrom), [items, openFrom])
  const days = useMemo(() => newsDays(opened, all), [opened, all])
  const newsWaiting = useDelayed(newsMode && news.data === null && news.error === null)
  const chartWaiting = useDelayed(candles === null && !candlesFailed)

  const recent = useMemo(() => issues.slice(0, RECENT_ISSUE_COUNT), [issues])

  const view: EventView = newsMode
    ? newsView({
        days,
        opened,
        items,
        openFrom,
        dayFilter,
        page,
        picked,
        today,
        newsWaiting,
        loaded: news.data !== null,
        failed: news.data === null && news.error !== null,
        onRetry: news.refetch,
        onOpenNews,
        onDay: (day) => {
          setDayFilter(day)
          setPage(1)
        },
        onMore: () => setPage((n) => n + 1),
        onLogin: promptLogin,
      })
    : issueView({ recent, picked, today, from: `${pathname}${search}`, retry: issueRetry })

  const selected = view.markers.find((marker) => marker.key === picked)?.key ?? view.markers[0]?.key ?? null
  const pickMarker = (key: string) => {
    setPicked(key)
    if (newsMode) {
      setDayFilter(key)
      setPage(1)
    }
  }

  let chart: ReactNode
  if (candlesFailed && candles === null) {
    chart = (
      <section className="fg-section fg-pc" aria-label="주가">
        <h2 className="fg-section__title">주가</h2>
        <StateBlock
          kind="error"
          title="차트를 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요"
          action={
            <Button size="sm" onClick={onRetryCandles}>
              다시 시도
            </Button>
          }
        />
      </section>
    )
  } else if (candles === null) {
    chart = (
      <section className="fg-section fg-pc" aria-label="주가" aria-busy="true">
        <h2 className="fg-section__title">주가</h2>
        <div className="fg-pc__lw fg-pc__wait">{chartWaiting && <Skeleton height="100%" />}</div>
      </section>
    )
  } else if (candles.length === 0) {
    chart = (
      <section className="fg-section fg-pc" aria-label="주가">
        <h2 className="fg-section__title">주가</h2>
        <StateBlock kind="empty" title="아직 이 종목의 시세가 없어요" description="거래가 쌓이면 여기에 보여 드려요" />
      </section>
    )
  } else {
    chart = (
      <PriceChart
        name={stock.name}
        ticker={stock.ticker}
        candles={candles}
        markers={view.markers.length > 0 ? view.markers : null}
        markerLabel={view.label}
        showMarkers={showMarkers}
        onToggleMarkers={() => setShowMarkers((on) => !on)}
        selected={selected}
        onSelect={pickMarker}
        callout={view.callout}
      />
    )
  }

  return (
    <div className="fg-grid fg-reveal">
      <div className="fg-col">
        {chart}
        <StockEventList
          title={newsMode ? '이 종목이 나온 뉴스' : '이 종목이 나온 이슈'}
          sub={`왜 움직였는지 ${view.label}로 따라가요 · ${newsMode ? '최신순' : STOCK_ISSUE_ORDER}`}
          moreLabel={newsMode || issueTotal === 0 ? '뉴스·이슈 모두 보기' : `뉴스·이슈 ${issueTotal}건 모두 보기`}
          mock={false}
          rows={view.rows}
          selected={showMarkers ? selected : null}
          onPick={setPicked}
          tools={
            newsMode && dayFilter !== null ? (
              <div className="fg-sev__tools">
                <FilterChip
                  pressed
                  aria-label={`${monthDayLabel(dayFilter, Number(today.slice(0, 4)))} 뉴스만 보기 풀기`}
                  onClick={() => {
                    setDayFilter(null)
                    setPage(1)
                  }}
                >
                  {`${monthDayLabel(dayFilter, Number(today.slice(0, 4)))} 뉴스 ${newsPage(opened, dayFilter, 0).total}건`}
                  <X size={16} strokeWidth={1.75} aria-hidden="true" />
                </FilterChip>
              </div>
            ) : null
          }
        >
          {view.list}
        </StockEventList>
      </div>
      <aside className="fg-rail" aria-label="핵심 지표와 이어진 기업">
        <StockKeyStats
          stock={stock}
          tradingValue={served ? (stock.tradeValue ?? null) : tradingValueOf(themeStocks.data, stock.ticker)}
          tradingLoading={!served && themeLoading}
          tradingRatio={tradingRatio}
          capRank={capRank}
          themes={stockThemes.data}
          themeId={compareTheme}
          onPickTheme={(id) => setPickedTheme({ ticker: stock.ticker, id })}
          compare={compare.data}
          streaks={streaks}
          failed={{
            trading: !served && themeFailed ? themeStocks.refetch : null,
            rank: stocksFailed ? stocks.refetch : null,
            compare: compare.error ? compare.refetch : null,
            streaks: flowsFailed ? flows.refetch : null,
          }}
        />
        <StockLinkedRail stockName={stock.name} linked={linked} />
        <Disclaimer />
      </aside>
    </div>
  )
}

interface IssueViewInput {
  recent: readonly StockIssueEvent[]
  picked: string | null
  today: string
  from: string
  retry: (() => void) | null
}

function issueView({ recent, picked, today, from, retry }: IssueViewInput): EventView {
  const placed = recent.flatMap((issue) => (issue.index === null ? [] : [{ key: issue.key, index: issue.index, title: issue.title }]))
  const titles = new Map(placed.map((issue) => [issue.key, issue.title]))
  const markers = stackMarkers(placed).map((marker) => ({ ...marker, title: titles.get(marker.key) ?? '' }))
  const rows: EventRow[] = recent.map((issue) => ({
    key: issue.key,
    marker: issue.key,
    dateLabel: issueDayLabel(issue.date, today),
    title: issue.title,
    badge: null,
    meta: `${issue.media}개 매체 · 기사 ${issue.articles}건`,
    dayLabel: issue.index === null ? null : tradingDayLabel(issue),
    change: issue.change,
    action: issueAction(issue, from),
  }))
  const current =
    recent.find((issue) => issue.key === picked && issue.index !== null) ?? recent.find((issue) => issue.index !== null) ?? null
  return {
    label: '이슈',
    markers,
    rows,
    callout: current && (
      <EventCallout
        dateLabel={`${issueDayLabel(current.date, today)} · ${current.media}개 매체`}
        title={current.title}
        dayLabel={current.index === null ? null : tradingDayLabel(current)}
        change={current.change}
        volumeRatio={current.volumeRatio}
        actionLabel="이슈 보기"
        action={issueAction(current, from)}
      />
    ),
    list: retry && (
      <StateBlock
        kind="error"
        title="이슈를 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
        action={
          <Button size="sm" onClick={retry}>
            다시 시도
          </Button>
        }
      />
    ),
  }
}

interface NewsViewInput {
  days: readonly NewsDay[]
  opened: readonly ThemeNewsItem[]
  items: readonly ThemeNewsItem[]
  openFrom: string | null
  dayFilter: string | null
  page: number
  picked: string | null
  today: string
  newsWaiting: boolean
  loaded: boolean
  failed: boolean
  onRetry: () => void
  onOpenNews: (id: string) => void
  onDay: (day: string) => void
  onMore: () => void
  onLogin: () => void
}

function newsView({
  days,
  opened,
  items,
  openFrom,
  dayFilter,
  page,
  picked,
  today,
  newsWaiting,
  loaded,
  failed,
  onRetry,
  onOpenNews,
  onDay,
  onMore,
  onLogin,
}: NewsViewInput): EventView {
  const dayOf = new Map(days.map((day) => [day.tradeDay, day]))
  const markers = days.map((day) => ({ key: day.tradeDay, index: day.index, stack: 0, title: day.items[0].title }))
  const { rows: shown, total } = newsPage(opened, dayFilter, OVERVIEW_NEWS_PAGE * page)
  const rows: EventRow[] = shown.map((item) => {
    const day = dayOf.get(item.tradeDay)
    return {
      key: item.id,
      marker: item.tradeDay,
      dateLabel: issueDayLabel(item.day, today),
      title: item.title,
      badge: item.analyzed ? <Badge>분석</Badge> : null,
      meta: `${item.press} · ${item.time}`,
      dayLabel: day ? (item.day === item.tradeDay ? '이 날' : '다음 거래일') : null,
      change: day?.change ?? null,
      action: newsAction(item, onOpenNews),
    }
  })
  const current = dayOf.get(picked ?? '') ?? days[0] ?? null
  const more = Math.min(OVERVIEW_NEWS_PAGE, total - shown.length)
  const gated = openFrom !== null && items.some((item) => item.day < openFrom)
  return {
    label: '뉴스',
    markers,
    rows,
    callout: current && (
      <EventCallout
        dateLabel={`${issueDayLabel(current.tradeDay, today)} · 뉴스 ${current.items.length}건`}
        title={current.items[0].title}
        dayLabel="이 날"
        change={current.change}
        volumeRatio={current.volumeRatio}
        actionLabel={`이 날 뉴스 ${current.items.length}건 보기`}
        action={{ kind: 'button', run: () => onDay(current.tradeDay) }}
      />
    ),
    list: (
      <>
        {failed && (
          <StateBlock
            kind="error"
            title="뉴스를 불러오지 못했어요"
            description="잠시 후 다시 시도해 주세요"
            action={
              <Button size="sm" onClick={onRetry}>
                다시 시도
              </Button>
            }
          />
        )}
        {!loaded && newsWaiting && <Skeleton height={240} />}
        {loaded && items.length === 0 && (
          <StateBlock
            kind="empty"
            title="아직 이 종목이 나온 뉴스가 없어요"
            description="새 뉴스가 나오면 여기에 바로 보여 드려요"
          />
        )}
        {loaded && items.length > 0 && opened.length === 0 && !gated && (
          <StateBlock kind="empty" title="최근 뉴스가 없어요" description="뉴스·이슈 탭에서 지난 뉴스를 볼 수 있어요" />
        )}
        {more > 0 && (
          <Button className="fg-sev__more" onClick={onMore}>
            {`뉴스 ${more}건 더 보기`}
          </Button>
        )}
        {gated && (
          <div className="fg-tnw__gate">
            <span className="fg-tnw__lock" aria-hidden="true">
              <Lock size={20} strokeWidth={1.75} />
            </span>
            <span className="fg-tnw__gtxt">
              <b>{`${NEWS_GATE_SUBJECT}${josa(NEWS_GATE_SUBJECT, '은/는')} 로그인하면 볼 수 있어요`}</b>
              <span>최근 7일 뉴스만 열려 있어요</span>
            </span>
            <Button variant="primary" className="fg-tnw__login" onClick={onLogin}>
              로그인
            </Button>
          </div>
        )}
        {loaded && items.length > 0 && (
          <p className="fg-sev__note">
            ‘분석’은 Finngraph가 기사에서 기업 사이 관계를 뽑아낸 뉴스예요 · 분석 뉴스는 요약 창으로, 나머지는 매체 원문으로
            가요
          </p>
        )}
      </>
    ),
  }
}
