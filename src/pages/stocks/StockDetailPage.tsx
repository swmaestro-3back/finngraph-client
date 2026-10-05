import { ChevronLeft } from 'lucide-react'
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { NewsDetailModal } from '@/components/news/NewsDetailModal'
import { Button, ButtonLink } from '@/components/fg/Button'
import { ChartNotice } from '@/components/fg/ChartNotice'
import { IssuePreviewSheet } from '@/components/fg/IssuePreviewSheet'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { StockFinanceTab } from '@/components/fg/StockFinanceTab'
import { StockHeader } from '@/components/fg/StockHeader'
import { StockLinksTab } from '@/components/fg/StockLinksTab'
import { StockNewsTab } from '@/components/fg/StockNewsTab'
import { StockOverview } from '@/components/fg/StockOverview'
import { StockPinBar } from '@/components/fg/StockPinBar'
import type { TabCounts } from '@/components/fg/StockTabs'
import { useAutoRefresh } from '@/lib/autoRefresh'
import { kstToday } from '@/lib/calendar'
import { stockSelectPath } from '@/lib/fg/paths'
import {
  navState,
  parseStockTab,
  sheetPushed,
  stockBasisLabel,
  withIssue,
} from '@/lib/fg/stockDetail'
import { flowSteps, placeIssues } from '@/lib/fg/stockIssues'
import { changeAmount, QUOTE_CANDLE_LIMIT, statusOf, week52Summary } from '@/lib/fg/stockQuote'
import { useDelayed } from '@/lib/fg/useDelayed'
import { usePinned } from '@/lib/fg/usePinned'
import { useBackTarget } from '@/lib/navigation'
import { useCandles } from '@/lib/queries/useCandles'
import { useStockDetail } from '@/lib/queries/useStockDetail'
import { useThemeMarket } from '@/lib/queries/useThemeMarket'
import { useThemeStocks } from '@/lib/queries/useThemeStocks'
import { useGap } from '@/lib/useGap'

const loadIssues = import.meta.env.DEV
  ? () => import('@/dev/fixtures/stockDetail').then((m) => m.stockIssueFlowsFixture)
  : null
const loadLinked = import.meta.env.DEV
  ? () => import('@/dev/fixtures/stockDetail').then((m) => m.linkedPreviewFixture)
  : null
const loadRatio = import.meta.env.DEV
  ? () => import('@/dev/fixtures/stockDetail').then((m) => m.tradingRatioFixture)
  : null

const HEADER_SELECTOR = '.fg-gh'

export default function StockDetailPage() {
  const { stockCode } = useParams()
  const code = stockCode ?? ''
  return <StockDetailView key={code} code={code} />
}

function StockDetailView({ code }: { code: string }) {
  const navigate = useNavigate()
  const { pathname, search, state } = useLocation()
  const tab = parseStockTab(search)
  const issueKey = new URLSearchParams(search).get('issue')
  const back = useBackTarget({ to: stockSelectPath(code), label: '종목' })
  const detail = useStockDetail(code)
  const candles = useCandles(code, 'D', QUOTE_CANDLE_LIMIT)
  const themeStocks = useThemeStocks(detail.data?.themeId ?? null)
  const market = useThemeMarket()
  const issuesGap = useGap('stock-issues', loadIssues)
  const linkedGap = useGap('linked-companies', loadLinked)
  const ratioGap = useGap('stock-quote-ext', loadRatio)
  const [today] = useState(() => kstToday(new Date()))
  const [refreshKey, setRefreshKey] = useState(0)
  const [openNewsId, setOpenNewsId] = useState<string | null>(null)
  const [tabsEl, setTabsEl] = useState<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const issueTrigger = useRef<HTMLElement | null>(null)
  const newsTrigger = useRef<HTMLElement | null>(null)
  const pinned = usePinned(tabsEl)

  const { refresh: refreshDetail } = detail
  const { refresh: refreshCandles } = candles
  const { refresh: refreshThemeStocks } = themeStocks
  const { refresh: refreshMarket } = market
  const refreshPrices = useCallback(() => {
    refreshDetail()
    refreshCandles()
    refreshThemeStocks()
    refreshMarket()
    setRefreshKey((key) => key + 1)
  }, [refreshDetail, refreshCandles, refreshThemeStocks, refreshMarket])
  useAutoRefresh(refreshPrices, market.data)

  const shownTab = useRef(tab)
  useLayoutEffect(() => {
    if (shownTab.current === tab) return
    shownTab.current = tab
    const panelEl = panelRef.current
    if (!panelEl) return
    panelEl.style.minHeight = ''
    if (!pinned || !tabsEl) return
    const header = document.querySelector<HTMLElement>(HEADER_SELECTOR)?.offsetHeight ?? 0
    const below = panelEl.getBoundingClientRect().top - tabsEl.getBoundingClientRect().top
    panelEl.style.minHeight = `${Math.max(0, window.innerHeight - header - below)}px`
    window.scrollTo({ top: tabsEl.getBoundingClientRect().top + window.scrollY - header })
  }, [tab, pinned, tabsEl])

  const stock = detail.data
  const rows = candles.data
  const status = statusOf(themeStocks.data, code, rows)
  const candlesFailed = candles.error !== null && rows === null
  const issueFixture = issuesGap.status === 'mock' ? issuesGap.data : null
  const placed = useMemo(() => (issueFixture && rows ? placeIssues(issueFixture, rows) : null), [issueFixture, rows])
  const eventSource = issuesGap.status === 'not-ready' ? 'news' : issuesGap.status === 'mock' ? 'issues' : null
  const linked = linkedGap.status === 'mock' ? linkedGap.data : null
  const tradingRatio = ratioGap.status === 'mock' ? ratioGap.data : null
  const counts: TabCounts = {
    ...(placed ? { news: { gap: 'stock-issues', value: placed.length } } : {}),
    ...(linked ? { links: { gap: 'linked-companies', value: linked.total } } : {}),
  }
  const skeleton = useDelayed(stock === null && detail.error === null)
  const notFound = code === '' || detail.error?.isNotFound === true

  const sheetIssue = placed?.find((issue) => issue.key === issueKey) ?? null
  const openIssue = (next: string) => {
    issueTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    navigate({ search: withIssue(search, next) }, { state: navState(state, true) })
  }
  const pickIssue = (next: string) =>
    navigate({ search: withIssue(search, next) }, { replace: true, state: navState(state, sheetPushed(state)) })
  const closeIssue = () => {
    if (sheetPushed(state)) navigate(-1)
    else navigate({ search: withIssue(search, null) }, { replace: true, state: navState(state) })
  }
  const openNews = (id: string) => {
    newsTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setOpenNewsId(id)
  }

  let body: ReactNode
  if (notFound) {
    body = (
      <section className="fg-section">
        <StateBlock
          kind="empty"
          title="이 종목을 찾지 못했어요"
          description="목록에서 다른 종목을 골라 주세요"
          action={
            <ButtonLink to="/stocks" size="sm">
              종목 목록 보기
            </ButtonLink>
          }
        />
      </section>
    )
  } else if (detail.error && stock === null) {
    body = (
      <section className="fg-section">
        <StateBlock
          kind="error"
          title="데이터를 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요"
          action={
            <Button size="sm" onClick={detail.refetch}>
              다시 시도
            </Button>
          }
        />
      </section>
    )
  } else if (stock === null) {
    body = skeleton ? (
      <>
        <Skeleton height={248} shape="card" />
        <div className="fg-grid" aria-hidden="true">
          <div className="fg-col">
            <Skeleton height={520} shape="card" />
          </div>
          <div className="fg-rail">
            <Skeleton height={320} shape="card" />
          </div>
        </div>
      </>
    ) : null
  } else {
    let panel: ReactNode
    if (tab === 'news')
      panel = (
        <StockNewsTab
          stock={stock}
          candles={rows}
          candlesFailed={candlesFailed}
          onRetryCandles={candles.refetch}
          issueMode={issuesGap.status}
          placed={placed}
          today={today}
          refreshKey={refreshKey}
          onOpenIssue={openIssue}
          onOpenNews={openNews}
        />
      )
    else if (tab === 'links') panel = <StockLinksTab stock={stock} />
    else if (tab === 'finance')
      panel = <StockFinanceTab stock={stock} candles={rows} today={today} refreshKey={refreshKey} />
    else
      panel = (
        <StockOverview
          stock={stock}
          candles={rows}
          candlesFailed={candlesFailed}
          onRetryCandles={candles.refetch}
          themeStocks={themeStocks}
          source={eventSource}
          issues={placed ?? []}
          linked={linked}
          tradingRatio={tradingRatio}
          today={today}
          search={search}
          refreshKey={refreshKey}
          onOpenIssue={openIssue}
          onOpenNews={openNews}
        />
      )
    body = (
      <>
        <StockHeader
          stock={stock}
          basis={stockBasisLabel(stock, market.data)}
          amount={changeAmount(rows ?? [], stock.price, stock.change, stock.changeAmount)}
          week52={rows ? week52Summary(rows) : null}
          week52Loading={rows === null && !candlesFailed}
          status={status}
          today={today}
          tab={tab}
          counts={counts}
          tabsRef={setTabsEl}
        />
        <div ref={panelRef} className="fg-sdp__panel">
          {panel}
        </div>
        <StockPinBar stock={stock} on={pinned} status={status} tab={tab} counts={counts} />
        {tab !== 'links' && <ChartNotice />}
        {placed && (
          <IssuePreviewSheet
            stockName={stock.name}
            issue={sheetIssue}
            steps={sheetIssue ? flowSteps(placed, sheetIssue.flowId) : []}
            refYear={Number(today.slice(0, 4))}
            sharePath={`${pathname}${search}`}
            returnFocusRef={issueTrigger}
            onPick={pickIssue}
            onClose={closeIssue}
          />
        )}
      </>
    )
  }

  return (
    <div className="fg-main fg-wrap fg-sdp">
      <Link to={back.to} className="fg-tdp__back">
        <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
        {back.label}
      </Link>
      {body}
      <NewsDetailModal
        newsId={openNewsId}
        onOpenChange={(open) => !open && setOpenNewsId(null)}
        returnFocusRef={newsTrigger}
      />
    </div>
  )
}
