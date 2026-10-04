import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/fg/Button'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { FilterChip } from '@/components/fg/FilterChip'
import { MockBadge } from '@/components/fg/Gap'
import { Pager } from '@/components/fg/Pager'
import { Segment, type TabOption } from '@/components/fg/SegmentedTabs'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { StockFold, StockPanel, type PanelRetry } from '@/components/fg/StockPanel'
import { StockTable } from '@/components/fg/StockTable'
import { useAuth } from '@/lib/auth'
import { useAutoRefresh } from '@/lib/autoRefresh'
import { kstToday } from '@/lib/calendar'
import { useFavorites } from '@/lib/favorites'
import { FLOW_DAYS, QUOTE_CANDLE_LIMIT, stockSummary } from '@/lib/fg/stockQuote'
import {
  filterStocks,
  keepCode,
  pageOfCode,
  pageRowsOf,
  parseStockQuery,
  resolveStockPage,
  resolveStockSort,
  scopeCaption,
  scopeTitle,
  sortStocks,
  stockPageCount,
  stockQueryFix,
  stockQueryString,
  stockSelection,
  STOCK_SORT_LABEL,
  type StockMarket,
  type StockQuery,
  type StockSort,
  type ValueOf,
} from '@/lib/fg/stocks'
import { themeBasisLabel } from '@/lib/fg/themes'
import { useDelayed } from '@/lib/fg/useDelayed'
import { useMediaQuery } from '@/lib/fg/useMediaQuery'
import { fetchCandles } from '@/lib/queries/useCandles'
import { fetchInvestorFlows } from '@/lib/queries/useInvestorFlows'
import { useKeyed } from '@/lib/queries/useKeyed'
import { useStocksCached } from '@/lib/queries/useStocksCached'
import { useThemeMarket } from '@/lib/queries/useThemeMarket'
import { fetchThemeStocks } from '@/lib/queries/useThemeStocks'
import { LARGE_CAP_RANK, type PresetKey } from '@/lib/stockFilter'
import { useGap } from '@/lib/useGap'

const loadQuote = import.meta.env.DEV
  ? () => import('@/dev/fixtures/stocks').then((m) => m.stockQuoteFixture)
  : null
const loadIssue = import.meta.env.DEV
  ? () => import('@/dev/fixtures/stocks').then((m) => m.stockIssueFixture)
  : null

const MARKETS: readonly { value: StockMarket; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'KOSPI', label: '코스피' },
  { value: 'KOSDAQ', label: '코스닥' },
]
const PRESETS: readonly { value: PresetKey; label: string; rule: string }[] = [
  { value: 'largeCap', label: '대형주', rule: `코스피·코스닥을 합친 시가총액 1~${LARGE_CAP_RANK}위` },
  { value: 'lowPer', label: '저PER', rule: 'PER 0 초과 10 미만' },
  { value: 'highRoe', label: '고ROE', rule: 'ROE 10% 이상' },
  { value: 'highDividend', label: '고배당', rule: '배당수익률 5% 이상' },
]
const FOOTNOTE = `조건 칩 기준은 ${PRESETS.map((preset) => `${preset.label} ${preset.rule}`).join(' · ')}이에요 · 52주 범위는 최근 1년 종가 기준이에요`

function sortOptions(valueReady: boolean): TabOption<StockSort>[] {
  return [
    { value: 'cap', label: '시가총액 순' },
    ...(valueReady ? [{ value: 'value' as const, label: '거래대금 순' }] : []),
    { value: 'rise', label: '상승률 순' },
    { value: 'fall', label: '하락률 순' },
  ]
}

export default function StocksPage() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const { status } = useAuth()
  const { has, ready: favoritesReady } = useFavorites()
  const inline = useMediaQuery('(max-width: 1023px)')
  const narrow = useMediaQuery('(max-width: 767px)')
  const query = useMemo(() => parseStockQuery(search), [search])
  const [today] = useState(() => kstToday(new Date()))
  const quoteGap = useGap('stock-quote-ext', loadQuote)
  const quoteOf = quoteGap.status === 'mock' ? quoteGap.data : null
  const issueGap = useGap('stock-issues', loadIssue)
  const issueOf = issueGap.status === 'mock' ? issueGap.data : null
  const authed = status === 'authenticated'
  const favOnly = query.fav && authed
  const sort = resolveStockSort(query.sort, quoteOf !== null)

  const stocks = useStocksCached()
  const market = useThemeMarket()
  const all = stocks.data
  const isFavorite = useCallback((ticker: string) => has('STOCK', ticker), [has])
  const filtered = useMemo(
    () => filterStocks(all ?? [], query, favOnly, isFavorite),
    [all, query, favOnly, isFavorite],
  )
  const valueOf = useCallback<ValueOf>((stock) => quoteOf?.(stock)?.tradingValue ?? null, [quoteOf])
  const sorted = useMemo(() => sortStocks(filtered, sort, valueOf), [filtered, sort, valueOf])
  const pageCount = stockPageCount(sorted.length)
  const listReady = all !== null && status !== 'loading' && (!favOnly || favoritesReady)

  const entry = useRef<'wait' | 'done'>(query.page === null && query.code !== null ? 'wait' : 'done')
  const entryWaiting = entry.current === 'wait'
  const entryPage = entryWaiting && listReady ? pageOfCode(sorted, query.code) : null
  const page = resolveStockPage(query.page, entryPage, pageCount)
  const fix = useMemo(() => {
    if (!listReady) return null
    if (entryPage !== null && entryPage > 1) return { ...query, page: entryPage }
    return stockQueryFix(search, query, sorted)
  }, [listReady, entryPage, search, query, sorted])
  const fixSearch = fix ? stockQueryString(fix) : null
  const fixedFrom = useRef<string | null>(null)
  useEffect(() => {
    if (!listReady) return
    entry.current = 'done'
    if (fixSearch === null || fixedFrom.current === search) return
    fixedFrom.current = search
    navigate({ pathname, search: fixSearch }, { replace: true })
  }, [listReady, fixSearch, search, navigate, pathname])
  const wantedCode = fix ? fix.code : query.code

  const pageRows = useMemo(() => pageRowsOf(sorted, page), [sorted, page])
  const view = useMemo(
    () => (listReady && all ? stockSelection(pageRows, sorted, all, wantedCode) : null),
    [listReady, all, pageRows, sorted, wantedCode],
  )
  const selected = view?.selected ?? null
  const code = selected?.ticker ?? null

  const candles = useKeyed(code, (ticker) => fetchCandles(ticker, 'D', QUOTE_CANDLE_LIMIT))
  const flows = useKeyed(code, (ticker) => fetchInvestorFlows(ticker, FLOW_DAYS))
  const themeStocks = useKeyed(selected?.themeId ?? null, fetchThemeStocks)
  const summary = useMemo(
    () =>
      selected
        ? stockSummary({
            ticker: selected.ticker,
            price: selected.price,
            change: selected.change,
            candles: candles.loading ? null : (candles.data ?? []),
            flows: flows.loading ? null : (flows.data ?? []),
            themeStocks: themeStocks.loading ? null : (themeStocks.data ?? []),
            failed: {
              candles: candles.error !== null,
              flows: flows.error !== null,
              themeStocks: themeStocks.error !== null,
            },
          })
        : null,
    [
      selected,
      candles.loading,
      candles.data,
      candles.error,
      flows.loading,
      flows.data,
      flows.error,
      themeStocks.loading,
      themeStocks.data,
      themeStocks.error,
    ],
  )
  const { retry: retryCandles } = candles
  const { retry: retryFlows } = flows
  const { retry: retryThemeStocks } = themeStocks
  const retry = useMemo<PanelRetry>(
    () => ({ candles: retryCandles, flows: retryFlows, themeStocks: retryThemeStocks }),
    [retryCandles, retryFlows, retryThemeStocks],
  )

  const { refresh: refreshStocks } = stocks
  const { refresh: refreshMarket } = market
  const { refresh: refreshCandles } = candles
  const { refresh: refreshFlows } = flows
  const { refresh: refreshThemeStocks } = themeStocks
  const refreshPrices = useCallback(() => {
    refreshStocks()
    refreshMarket()
    refreshCandles()
    refreshFlows()
    refreshThemeStocks()
  }, [refreshStocks, refreshMarket, refreshCandles, refreshFlows, refreshThemeStocks])
  useAutoRefresh(refreshPrices, market.data)

  const [pick, setPick] = useState<string | null>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const [entryReveal] = useState(() => query.code !== null)
  const revealed = useRef(false)
  const summaryLoading = summary?.loading ?? true
  useEffect(() => {
    if (!entryReveal || revealed.current || view === null) return
    if (pick !== null || selected === null) {
      revealed.current = true
      return
    }
    if (summaryLoading) return
    revealed.current = true
    rowRef.current?.scrollIntoView({ block: inline ? 'start' : 'nearest' })
  }, [entryReveal, pick, view, selected, summaryLoading, inline])

  const from = `${pathname}${search}`
  const go = (patch: Partial<StockQuery>) =>
    navigate({ pathname, search: stockQueryString({ ...query, ...patch }) }, { replace: true })
  const select = (next: string) => {
    setPick(next)
    go({ code: next, page: page > 1 ? page : null })
  }
  const setSort = (next: StockSort) => go({ sort: next === 'cap' ? null : next, page: null })
  const setScope = (nextMarket: StockMarket, fav: boolean) => {
    if (fav && !authed) {
      navigate('/login', { state: { next: from } })
      return
    }
    const rows = filterStocks(all ?? [], { market: nextMarket, presets: query.presets }, fav, isFavorite)
    go({ market: fav ? 'ALL' : nextMarket, fav, page: null, code: keepCode(query.code, rows) })
  }
  const togglePreset = (preset: PresetKey) => {
    const presets = query.presets.includes(preset)
      ? query.presets.filter((value) => value !== preset)
      : [...query.presets, preset]
    const rows = filterStocks(all ?? [], { market: query.market, presets }, favOnly, isFavorite)
    go({ presets, page: null, code: keepCode(query.code, rows) })
  }

  const listSkeleton = useDelayed(!listReady && !stocks.error)
  const basis = themeBasisLabel(market.data)
  const title = scopeTitle(query.market, favOnly)
  const caption = `${scopeCaption(query.market, favOnly, sorted.length)} · ${STOCK_SORT_LABEL[sort]} · 행을 누르면 종목 요약을 보여 줘요`

  let body: ReactNode = null
  if (stocks.error && all === null) {
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
  } else if (!listReady || view === null) {
    body = listSkeleton ? (
      <div className="fg-stocks__skel" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} height={56} />
        ))}
      </div>
    ) : null
  } else if (sorted.length === 0) {
    body =
      favOnly && query.presets.length === 0 ? (
        <StateBlock kind="empty" title="관심 종목이 없어요" description="종목 상세에서 관심 종목을 추가해 보세요" />
      ) : (
        <StateBlock kind="empty" title="조건에 맞는 종목이 없어요" description="조건 칩을 줄여 보세요" />
      )
  } else {
    body = (
      <StockTable
        rows={view.rows}
        label={`${title}, ${STOCK_SORT_LABEL[sort]}`}
        sort={sort}
        onSort={setSort}
        quoteOf={quoteOf}
        selectedCode={code}
        selectedStatus={summary?.status ?? null}
        onSelect={select}
        expanded={inline && selected && summary ? <StockFold stock={selected} summary={summary} retry={retry} /> : null}
        selectedRef={rowRef}
      />
    )
  }

  let panel: ReactNode = null
  if (selected && summary) {
    panel = (
      <StockPanel key={selected.ticker} stock={selected} summary={summary} issueOf={issueOf} today={today} retry={retry} />
    )
  } else if (view?.missing) {
    panel = (
      <section className="fg-section fg-sdet fg-sdet--empty fg-rail__wide">
        <StateBlock kind="empty" title="이 종목을 찾지 못했어요" description="목록에서 다른 종목을 골라 주세요" />
      </section>
    )
  } else if (listSkeleton) {
    panel = (
      <section className="fg-section fg-sdet fg-sdet--empty fg-rail__wide" aria-hidden="true">
        <Skeleton height={480} shape="card" />
      </section>
    )
  }

  return (
    <div className="fg-main fg-wrap fg-stocks">
      <header className="fg-pagehead">
        <h1 className="fg-pagehead__title">종목</h1>
        {basis && <span className="fg-pagehead__meta">{basis}</span>}
      </header>
      <div className="fg-grid">
        <div className="fg-col">
          <section className="fg-section" aria-labelledby="fg-stocks-main">
            <div className="fg-section__head">
              <h2 id="fg-stocks-main" className="fg-section__title">
                {title}
              </h2>
              {quoteOf && <MockBadge />}
            </div>
            {all && (
              <div className="fg-ttools">
                <div className="fg-ttools__l">
                  <div className="fg-chiprow" role="group" aria-label="시장과 관심 종목">
                    {MARKETS.map((option) => (
                      <FilterChip
                        key={option.value}
                        pressed={!favOnly && query.market === option.value}
                        onClick={() => setScope(option.value, false)}
                      >
                        {option.label}
                      </FilterChip>
                    ))}
                    <FilterChip pressed={favOnly} onClick={() => setScope('ALL', true)}>
                      관심 종목
                    </FilterChip>
                  </div>
                  <div className="fg-chiprow" role="group" aria-label="조건">
                    {PRESETS.map((preset) => (
                      <FilterChip
                        key={preset.value}
                        pressed={query.presets.includes(preset.value)}
                        title={preset.rule}
                        onClick={() => togglePreset(preset.value)}
                      >
                        {preset.label}
                      </FilterChip>
                    ))}
                  </div>
                  <Segment label="정렬" options={sortOptions(quoteOf !== null)} value={sort} onChange={setSort} />
                </div>
                <span className="fg-ttools__cap">{caption}</span>
              </div>
            )}
            {body}
            {listReady && sorted.length > 0 && (
              <Pager
                page={page}
                total={pageCount}
                searchOf={(target) => stockQueryString({ ...query, page: target, code: null })}
                compact={narrow}
                onGo={() => window.scrollTo(0, 0)}
              />
            )}
            <p className="fg-tfoot">{FOOTNOTE}</p>
          </section>
          <Disclaimer />
        </div>
        {!inline && (
          <aside className="fg-rail" aria-label="고른 종목">
            {panel}
          </aside>
        )}
      </div>
      <p className="fg-sr" aria-live="polite">
        {pick && selected?.ticker === pick ? `${selected.name} 골랐어요` : ''}
      </p>
    </div>
  )
}
