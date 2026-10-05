import { X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/fg/Button'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { FilterChip } from '@/components/fg/FilterChip'
import { Pager } from '@/components/fg/Pager'
import { Segment, type TabOption } from '@/components/fg/SegmentedTabs'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { RANGE_FIELDS, StockFilterSheet, type RangeFieldSpec } from '@/components/fg/StockFilterSheet'
import { StockFold, StockPanel, type PanelRetry } from '@/components/fg/StockPanel'
import { StockTable } from '@/components/fg/StockTable'
import type { StockRowRes } from '@/lib/apiTypes'
import { useAuth } from '@/lib/auth'
import { useAutoRefresh } from '@/lib/autoRefresh'
import { kstToday } from '@/lib/calendar'
import { useFavorites } from '@/lib/favorites'
import { FLOW_DAYS, QUOTE_CANDLE_LIMIT, stockSummary } from '@/lib/fg/stockQuote'
import { formatCompactKrw, formatMultiple, formatPercent } from '@/lib/format'
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
import { useStockIssueLine } from '@/lib/queries/useHubSlots'
import { useKeyed } from '@/lib/queries/useKeyed'
import { useStocksCached } from '@/lib/queries/useStocksCached'
import { useThemeMarket } from '@/lib/queries/useThemeMarket'
import { fetchThemeStocks } from '@/lib/queries/useThemeStocks'
import { useThemesCached } from '@/lib/queries/useThemesCached'
import { LARGE_CAP_RANK, panelFilterCount, VALUE_TOP_RANK, type PresetKey, type RangeKey } from '@/lib/stockFilter'
import { useOverflowFade } from '@/lib/useOverflowFade'

const MARKETS: readonly { value: StockMarket; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'KOSPI', label: '코스피' },
  { value: 'KOSDAQ', label: '코스닥' },
]
const CONDITION_PRESETS: readonly { value: PresetKey; label: string; rule: string }[] = [
  { value: 'largeCap', label: '대형주', rule: `코스피·코스닥을 합친 시가총액 1~${LARGE_CAP_RANK}위` },
  { value: 'lowPer', label: '저PER', rule: 'PER 0 초과 10 미만' },
  { value: 'highRoe', label: '고ROE', rule: 'ROE 10% 이상' },
  { value: 'highDividend', label: '고배당', rule: '배당수익률 5% 이상' },
]
const QUOTE_PRESETS: readonly { value: PresetKey; label: string; rule: string }[] = [
  { value: 'week52High', label: '52주 신고가', rule: '가격 기준일 종가가 52주 신고가' },
  { value: 'week52Low', label: '52주 신저가', rule: '가격 기준일 종가가 52주 신저가' },
  { value: 'rising', label: '상승', rule: '등락률 0% 초과' },
  { value: 'falling', label: '하락', rule: '등락률 0% 미만' },
  { value: 'valueTop100', label: '거래대금 상위', rule: `지금 고른 시장 탭 안에서 거래대금 상위 ${VALUE_TOP_RANK}위` },
]
const PRESETS = [...CONDITION_PRESETS, ...QUOTE_PRESETS]
const FOOTNOTE = `조건 칩 기준은 ${PRESETS.map((preset) => `${preset.label} ${preset.rule}`).join(' · ')}이에요 · 52주 범위는 최근 1년 종가 기준이에요`

function rangeChipValue(key: RangeKey, value: number): string {
  if (key === 'marketCap') return formatCompactKrw(value * 1e8)
  if (key === 'per' || key === 'pbr') return formatMultiple(value)
  return formatPercent(value)
}

function rangeChipLabel(field: RangeFieldSpec, range: { min?: number; max?: number }): string {
  if (range.min !== undefined && range.max !== undefined) {
    return `${field.label} ${rangeChipValue(field.key, range.min)}~${rangeChipValue(field.key, range.max)}`
  }
  if (range.min !== undefined) return `${field.label} ${rangeChipValue(field.key, range.min)} 이상`
  if (range.max !== undefined) return `${field.label} ${rangeChipValue(field.key, range.max)} 이하`
  return field.label
}

function sortOptions(valueReady: boolean): TabOption<StockSort>[] {
  return [
    { value: 'cap', label: '시가총액 순' },
    ...(valueReady ? [{ value: 'value' as const, label: '거래대금 순' }] : []),
    { value: 'rise', label: '상승률 순' },
    { value: 'fall', label: '하락률 순' },
  ]
}

function ConditionChips({
  presets,
  onToggle,
}: {
  presets: readonly PresetKey[]
  onToggle: (preset: PresetKey) => void
}) {
  const { scrollRef, showFade, showLeftFade } = useOverflowFade<HTMLDivElement>()
  const fade = showFade && showLeftFade ? 'both' : showFade ? 'end' : showLeftFade ? 'start' : undefined
  return (
    <div className="fg-cflt__row fg-stable" ref={scrollRef} data-fade={fade}>
      <div className="fg-cflt__group" role="group" aria-label="조건">
        <span className="fg-cflt__label" aria-hidden="true">
          조건
        </span>
        {CONDITION_PRESETS.map((preset) => (
          <FilterChip
            key={preset.value}
            pressed={presets.includes(preset.value)}
            title={preset.rule}
            onClick={() => onToggle(preset.value)}
          >
            {preset.label}
          </FilterChip>
        ))}
      </div>
      <span className="fg-cflt__div" aria-hidden="true" />
      <div className="fg-cflt__group" role="group" aria-label="시세">
        <span className="fg-cflt__label" aria-hidden="true">
          시세
        </span>
        {QUOTE_PRESETS.map((preset) => (
          <FilterChip
            key={preset.value}
            pressed={presets.includes(preset.value)}
            title={preset.rule}
            onClick={() => onToggle(preset.value)}
          >
            {preset.label}
          </FilterChip>
        ))}
      </div>
    </div>
  )
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
  const authed = status === 'authenticated'
  const favOnly = query.fav && authed

  const stocks = useStocksCached()
  const market = useThemeMarket()
  const basisDate = market.data?.baseDate ?? null
  const all = stocks.data
  const highReady = useMemo(() => (all ?? []).some((row) => row.high52w != null), [all])
  const valueReady = useMemo(() => (all ?? []).some((row) => row.tradeValue != null), [all])
  const sort = resolveStockSort(query.sort, valueReady)
  const isFavorite = useCallback((ticker: string) => has('STOCK', ticker), [has])
  const themes = useThemesCached()
  const activeThemeName = useMemo(
    () => (query.themeId === null ? null : themes.data?.find((theme) => theme.id === query.themeId)?.name ?? null),
    [query.themeId, themes.data],
  )
  const filterThemeStocks = useKeyed(query.themeId, fetchThemeStocks)
  const themeTickers = useMemo(
    () => (filterThemeStocks.data ? new Set(filterThemeStocks.data.map((stock) => stock.ticker)) : null),
    [filterThemeStocks.data],
  )
  const filterContext = useMemo(() => ({ basisDate, themeTickers }), [basisDate, themeTickers])
  const filtered = useMemo(
    () => filterStocks(all ?? [], query, favOnly, isFavorite, filterContext),
    [all, query, favOnly, isFavorite, filterContext],
  )
  const valueOf = useCallback<ValueOf>((stock) => stock.tradeValue ?? null, [])
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
  const issueLine = useStockIssueLine(code)

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
            amount: selected.changeAmount,
            candles: candles.loading ? null : (candles.data ?? []),
            flows: flows.loading ? null : (flows.data ?? []),
            themeStocks: themeStocks.loading ? null : (themeStocks.data ?? []),
            failed: {
              candles: candles.error !== null,
              flows: flows.error !== null,
              themeStocks: themeStocks.error !== null,
            },
            quote: selected,
            basisDate,
          })
        : null,
    [
      selected,
      basisDate,
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
    const rows = filterStocks(
      all ?? [],
      { market: nextMarket, presets: query.presets, ranges: query.ranges, themeId: query.themeId },
      fav,
      isFavorite,
      filterContext,
    )
    go({ market: fav ? 'ALL' : nextMarket, fav, page: null, code: keepCode(query.code, rows) })
  }
  const togglePreset = (preset: PresetKey) => {
    const presets = query.presets.includes(preset)
      ? query.presets.filter((value) => value !== preset)
      : [...query.presets, preset]
    const rows = filterStocks(
      all ?? [],
      { market: query.market, presets, ranges: query.ranges, themeId: query.themeId },
      favOnly,
      isFavorite,
      filterContext,
    )
    go({ presets, page: null, code: keepCode(query.code, rows) })
  }
  const applyFilters = (ranges: StockQuery['ranges'], themeId: number | null, rows: readonly StockRowRes[]) => {
    go({ ranges, themeId, page: null, code: keepCode(query.code, rows) })
  }
  const resetFilters = () => {
    const rows = filterStocks(
      all ?? [],
      { market: query.market, presets: [], ranges: {}, themeId: null },
      favOnly,
      isFavorite,
      filterContext,
    )
    go({ presets: [], ranges: {}, themeId: null, page: null, code: keepCode(query.code, rows) })
  }
  const clearRange = (key: RangeKey) => {
    const ranges = { ...query.ranges }
    delete ranges[key]
    const rows = filterStocks(
      all ?? [],
      { market: query.market, presets: query.presets, ranges, themeId: query.themeId },
      favOnly,
      isFavorite,
      filterContext,
    )
    go({ ranges, page: null, code: keepCode(query.code, rows) })
  }
  const clearTheme = () => {
    const rows = filterStocks(
      all ?? [],
      { market: query.market, presets: query.presets, ranges: query.ranges, themeId: null },
      favOnly,
      isFavorite,
      filterContext,
    )
    go({ themeId: null, page: null, code: keepCode(query.code, rows) })
  }
  const clearPanelFilters = () => {
    const rows = filterStocks(
      all ?? [],
      { market: query.market, presets: query.presets, ranges: {}, themeId: null },
      favOnly,
      isFavorite,
      filterContext,
    )
    go({ ranges: {}, themeId: null, page: null, code: keepCode(query.code, rows) })
  }
  const [filterOpen, setFilterOpen] = useState(false)
  const filterTrigger = useRef<HTMLElement | null>(null)
  const openFilter = () => {
    filterTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setFilterOpen(true)
  }
  const filterBadge = panelFilterCount(query)
  const activeRangeChips = useMemo(
    () =>
      RANGE_FIELDS.flatMap((field) => {
        const range = query.ranges[field.key]
        if (range === undefined || (range.min === undefined && range.max === undefined)) return []
        return [{ key: field.key, label: rangeChipLabel(field, range) }]
      }),
    [query.ranges],
  )

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
    const hasConditions = query.presets.length > 0 || filterBadge > 0
    body =
      favOnly && !hasConditions ? (
        <StateBlock kind="empty" title="관심 종목이 없어요" description="종목 상세에서 관심 종목을 추가해 보세요" />
      ) : (
        <StateBlock
          kind="empty"
          title="조건에 맞는 종목이 없어요"
          description="조건을 줄이거나 초기화해 보세요"
          action={
            <Button size="sm" onClick={resetFilters}>
              조건 초기화
            </Button>
          }
        />
      )
  } else {
    body = (
      <StockTable
        rows={view.rows}
        label={`${title}, ${STOCK_SORT_LABEL[sort]}`}
        sort={sort}
        onSort={setSort}
        highReady={highReady}
        valueReady={valueReady}
        baseDate={basisDate}
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
      <StockPanel key={selected.ticker} stock={selected} summary={summary} issue={issueLine} today={today} retry={retry} />
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
            </div>
            {all && (
              <>
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
                    <Segment label="정렬" options={sortOptions(valueReady)} value={sort} onChange={setSort} />
                    <FilterChip
                      pressed={filterBadge > 0}
                      count={filterBadge > 0 ? filterBadge : null}
                      aria-haspopup="dialog"
                      aria-expanded={filterOpen}
                      onClick={openFilter}
                    >
                      필터
                    </FilterChip>
                  </div>
                  <span className="fg-ttools__cap">{caption}</span>
                </div>
                <div className="fg-cflt">
                  <ConditionChips presets={query.presets} onToggle={togglePreset} />
                  {filterBadge > 0 && (
                    <div className="fg-cflt__active">
                      {activeRangeChips.map((chip) => (
                        <FilterChip
                          key={chip.key}
                          pressed
                          className="fg-cflt__rm"
                          aria-label={`${chip.label} 필터 해제`}
                          onClick={() => clearRange(chip.key)}
                        >
                          {chip.label}
                          <X size={14} strokeWidth={2} aria-hidden="true" />
                        </FilterChip>
                      ))}
                      {query.themeId !== null && (
                        <FilterChip
                          pressed
                          className="fg-cflt__rm"
                          aria-label={`테마 ${activeThemeName ?? ''} 필터 해제`}
                          onClick={clearTheme}
                        >
                          테마 {activeThemeName ?? ''}
                          <X size={14} strokeWidth={2} aria-hidden="true" />
                        </FilterChip>
                      )}
                      <Button variant="text" className="fg-cflt__clear" onClick={clearPanelFilters}>
                        전체 해제
                      </Button>
                    </div>
                  )}
                </div>
              </>
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
      <StockFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        returnFocusRef={filterTrigger}
        allRows={all ?? []}
        market={query.market}
        presets={query.presets}
        favOnly={favOnly}
        isFavorite={isFavorite}
        basisDate={basisDate}
        ranges={query.ranges}
        themeId={query.themeId}
        onApply={applyFilters}
      />
    </div>
  )
}
