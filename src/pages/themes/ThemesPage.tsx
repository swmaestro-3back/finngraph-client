import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/fg/Button'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { FilterChip } from '@/components/fg/FilterChip'
import { Segment, type TabOption } from '@/components/fg/SegmentedTabs'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { ThemeActions } from '@/components/fg/ThemeActions'
import { ThemeLegend } from '@/components/fg/ThemeLegend'
import { ThemeMembers } from '@/components/fg/ThemeMembers'
import { ThemePanel } from '@/components/fg/ThemePanel'
import { ThemeTable } from '@/components/fg/ThemeTable'
import { ThemeTreemap } from '@/components/fg/ThemeTreemap'
import { useAuth } from '@/lib/auth'
import { useAutoRefresh } from '@/lib/autoRefresh'
import { useFavorites } from '@/lib/favorites'
import { formatChange } from '@/lib/format'
import { issueTitle } from '@/lib/fg/hub'
import {
  parseThemeQuery,
  resolveSort,
  resolveView,
  sortThemes,
  stableDefaultId,
  themeBasisLabel,
  themeLead,
  themeLeader,
  themeQueryString,
  themeTiles,
  toMapCount,
  visibleThemes,
  weightedChangeOf,
  type HeldDefault,
  type IssueOf,
  type ThemeIssueView,
  type ThemeQuery,
  type ThemeSort,
  type ThemeView,
} from '@/lib/fg/themes'
import { useDelayed } from '@/lib/fg/useDelayed'
import { useMediaQuery } from '@/lib/fg/useMediaQuery'
import { useHotThemes } from '@/lib/queries/useHotThemes'
import { useThemeIssueBoard } from '@/lib/queries/useStockIssues'
import { useThemeMarket } from '@/lib/queries/useThemeMarket'
import { useThemesCached } from '@/lib/queries/useThemesCached'
import { useThemeStocks } from '@/lib/queries/useThemeStocks'

const VIEW_OPTIONS: readonly TabOption<ThemeView>[] = [
  { value: 'map', label: '지도' },
  { value: 'table', label: '표' },
]
const SORT_OPTIONS: readonly TabOption<ThemeSort>[] = [
  { value: 'change', label: '등락률 순' },
  { value: 'value', label: '거래대금 순' },
]
const COUNT_OPTIONS: readonly TabOption<string>[] = [
  { value: '10', label: '10개' },
  { value: '20', label: '20개' },
  { value: '30', label: '30개' },
]
const SUB = '같은 이슈로 묶인 종목 그룹이에요 · 테마 등락률은 테마 종목의 시가총액 가중 평균이에요'
const FOOTNOTE =
  '등락률은 테마 지수 기준 · 시가총액 가중(종목당 최대 25%) · 거래대금은 테마 종목 합 · 주도주는 테마가 움직인 방향으로 오늘 가장 크게 움직인 종목이에요(추천이 아니에요)'
const MAP_LABEL = '테마 지도. 칸 크기는 등락률 크기, 색은 오늘 등락률이에요'

interface ThemePick {
  id: number
  reveal: boolean
}

export default function ThemesPage() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const { status } = useAuth()
  const { has } = useFavorites()
  const narrow = useMediaQuery('(max-width: 767px)')
  const inline = useMediaQuery('(max-width: 1023px)')
  const query = useMemo(() => parseThemeQuery(search), [search])
  const view = resolveView(query.view, narrow)
  const sort = resolveSort(query.sort)
  const favOn = query.fav && status === 'authenticated'
  const [showAll, setShowAll] = useState(false)

  const themes = useThemesCached()
  const market = useThemeMarket()
  const hot = useHotThemes(query.count, view === 'map')
  const list = themes.data
  const sorted = useMemo(() => sortThemes(list ?? [], sort, weightedChangeOf), [list, sort])
  const mapThemes = useMemo(() => {
    const items = hot.data ?? []
    return favOn ? items.filter((theme) => has('THEME', String(theme.id))) : items
  }, [hot.data, favOn, has])
  const tiles = useMemo(() => themeTiles(mapThemes, weightedChangeOf), [mapThemes])

  const requestedId = query.id
  const heldDefault = useRef<HeldDefault | null>(null)
  const defaultId = stableDefaultId(heldDefault.current, view, sort, sorted, mapThemes, weightedChangeOf)
  const defaultReady = view === 'map' ? hot.data !== null : list !== null
  useEffect(() => {
    if (requestedId !== null || !defaultReady) return
    heldDefault.current = defaultId === null ? null : { view, sort, id: defaultId }
  }, [requestedId, defaultReady, defaultId, view, sort])
  const selectedId = requestedId ?? defaultId
  const selected =
    selectedId === null
      ? null
      : (list?.find((theme) => theme.id === selectedId) ?? hot.data?.find((theme) => theme.id === selectedId) ?? null)
  const stocks = useThemeStocks(selected?.id ?? null)
  const tableThemes = useMemo(() => visibleThemes(sorted, showAll, selectedId), [sorted, showAll, selectedId])
  const issueIds = useMemo(() => {
    const ids = view === 'table' ? tableThemes.map((theme) => theme.id) : []
    return selected ? [...ids, selected.id] : ids
  }, [view, tableThemes, selected])
  const board = useThemeIssueBoard(issueIds, null)
  const boardData = board.data
  const issueOf = useMemo<IssueOf | null>(() => {
    if (!boardData) return null
    return (theme) => {
      const top = boardData.themes.get(theme.id)?.issues[0]
      return top ? { id: top.id, title: issueTitle(top), mediaCount: top.mediaCount } : null
    }
  }, [boardData])
  const panelIssue: ThemeIssueView = useMemo(() => {
    if (boardData && issueOf && selected) return { status: 'ready', issue: issueOf(selected), date: boardData.date }
    if (board.error) return { status: 'error', retry: board.retry }
    return { status: 'loading' }
  }, [boardData, issueOf, selected, board.error, board.retry])

  const [pick, setPick] = useState<ThemePick | null>(null)
  const panelRef = useRef<HTMLElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const [entryReveal] = useState(() => requestedId !== null)
  const entry = useRef<'wait' | 'loading' | 'done'>('wait')
  const entryReady = list !== null
  const selectedKey = selected?.id ?? null
  useEffect(() => {
    if (!entryReveal || entry.current === 'done') return
    if (pick !== null || (entryReady && selectedKey === null)) {
      entry.current = 'done'
      return
    }
    if (selectedKey === null) return
    if (stocks.loading) {
      entry.current = 'loading'
      return
    }
    if (entry.current !== 'loading' || !entryReady) return
    entry.current = 'done'
    if (view === 'table' && inline) rowRef.current?.scrollIntoView({ block: 'start' })
  }, [entryReveal, pick, entryReady, selectedKey, stocks.loading, view, inline])
  const revealed = useRef<ThemePick | null>(null)
  useEffect(() => {
    if (!pick?.reveal || revealed.current === pick || selectedId !== pick.id) return
    revealed.current = pick
    const smooth = window.matchMedia('(prefers-reduced-motion: no-preference)').matches
    panelRef.current?.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' })
  }, [pick, selectedId])

  const from = `${pathname}${search}`
  const select = useCallback(
    (id: number) => {
      setPick({ id, reveal: view === 'map' && inline })
      navigate({ pathname, search: themeQueryString({ ...query, id }) }, { replace: true })
    },
    [navigate, pathname, query, view, inline],
  )
  const setQuery = (patch: Partial<ThemeQuery>) =>
    navigate({ pathname, search: themeQueryString({ ...query, ...patch }) }, { replace: true })
  const toggleFavorites = () => {
    if (status !== 'authenticated') {
      navigate('/login', { state: { next: from } })
      return
    }
    setQuery({ fav: !query.fav })
  }

  const { refresh: refreshThemes } = themes
  const { refresh: refreshMarket } = market
  const { refresh: refreshHot } = hot
  const { refresh: refreshStocks } = stocks
  const refreshPrices = useCallback(() => {
    refreshThemes()
    refreshMarket()
    refreshHot()
    refreshStocks()
  }, [refreshThemes, refreshMarket, refreshHot, refreshStocks])
  useAutoRefresh(refreshPrices, market.data)

  const listSkeleton = useDelayed(themes.loading && list === null)
  const mapSkeleton = useDelayed(hot.loading && hot.data === null)
  const basis = themeBasisLabel(market.data)
  const lead = list ? themeLead(list, weightedChangeOf) : null
  const leader = selected ? themeLeader(selected) : null
  const caption =
    view === 'map'
      ? '칸을 누르면 테마 종목을 보여 줘요'
      : `${sort === 'change' ? '등락률 높은 순' : '거래대금 많은 순'} · 행을 누르면 테마 종목을 보여 줘요`

  const members = selected ? (
    <ThemeMembers
      key={selected.id}
      stocks={stocks.loading ? null : stocks.data}
      loading={stocks.loading}
      error={stocks.error}
      onRetry={stocks.refetch}
      leaderTicker={leader?.ticker ?? null}
      from={from}
    />
  ) : null

  const expansion = selected ? (
    <>
      <ThemeActions theme={selected} />
      {members}
    </>
  ) : null

  let mapBody: ReactNode = null
  if (hot.error && hot.data === null) {
    mapBody = (
      <StateBlock
        kind="error"
        title="데이터를 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
        action={
          <Button size="sm" onClick={hot.refetch}>
            다시 시도
          </Button>
        }
      />
    )
  } else if (hot.data === null) {
    mapBody = mapSkeleton ? <Skeleton height="var(--fg-tmap-h)" shape="card" /> : null
  } else if (tiles.length === 0) {
    mapBody = favOn ? (
      <StateBlock
        kind="empty"
        title={`오늘 상위 ${hot.data.length}개 테마 안에 관심 테마가 없어요`}
        description="표시 개수를 늘리거나 관심 테마를 더 담아 보세요"
      />
    ) : (
      <StateBlock kind="empty" title="핫 테마를 집계하고 있어요" description="시세가 들어오면 자동으로 보여 줘요" />
    )
  } else {
    mapBody = (
      <>
        <ThemeTreemap
          tiles={tiles}
          selectedId={selectedId}
          onSelect={select}
          label={MAP_LABEL}
          layoutKey={`${query.count}:${favOn ? 'fav' : 'all'}`}
        />
        <ThemeLegend />
      </>
    )
  }

  let body: ReactNode
  if (themes.error && list === null) {
    body = (
      <StateBlock
        kind="error"
        title="데이터를 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
        action={
          <Button size="sm" onClick={themes.refetch}>
            다시 시도
          </Button>
        }
      />
    )
  } else if (list === null) {
    body = listSkeleton ? <Skeleton height="var(--fg-tmap-h)" shape="card" /> : null
  } else if (list.length === 0) {
    body = <StateBlock kind="empty" title="테마 데이터가 아직 없어요" description="잠시 후 다시 확인해 주세요" />
  } else if (view === 'map') {
    body = mapBody
  } else {
    body = (
      <ThemeTable
        themes={tableThemes}
        total={sorted.length}
        onShowAll={() => setShowAll(true)}
        selectedId={selectedId}
        onSelect={select}
        changeOf={weightedChangeOf}
        issueOf={issueOf}
        expanded={inline ? expansion : null}
        selectedRef={rowRef}
      />
    )
  }

  let panel: ReactNode = null
  if (selected) {
    panel = (
      <ThemePanel
        key={selected.id}
        ref={panelRef}
        theme={selected}
        changeOf={weightedChangeOf}
        issue={panelIssue}
        members={members}
      />
    )
  } else if (requestedId !== null && list !== null) {
    panel = (
      <section className="fg-section fg-tdet fg-rail__wide">
        <StateBlock kind="empty" title="이 테마를 찾지 못했어요" description="목록에서 다른 테마를 골라 주세요" />
      </section>
    )
  } else if (listSkeleton) {
    panel = (
      <section className="fg-section fg-tdet fg-rail__wide" aria-hidden="true">
        <Skeleton height={320} shape="card" />
      </section>
    )
  }

  return (
    <div className="fg-main fg-wrap fg-themes" data-view={view}>
      <header className="fg-pagehead">
        <div>
          <h1 className="fg-pagehead__title">테마</h1>
          <p className="fg-pagehead__sub">{SUB}</p>
        </div>
        {basis && <span className="fg-pagehead__meta">{basis}</span>}
      </header>
      <div className="fg-grid">
        <div className="fg-col">
          <section className="fg-section" aria-labelledby="fg-themes-main">
            <div className="fg-section__head">
              <h2 id="fg-themes-main" className="fg-section__title">
                오늘 움직인 테마
              </h2>
            </div>
            {lead && (
              <p className="fg-tlead">
                <b>
                  {lead.ups > 0
                    ? `오늘 테마 ${lead.total}개 중 ${lead.ups}개가 올랐어요.`
                    : `오늘 테마 ${lead.total}개 중 오른 테마가 없어요.`}
                </b>
                {lead.best && ` 가장 많이 오른 테마는 ${lead.best.name}(${formatChange(lead.best.change)})예요.`}
              </p>
            )}
            {list && list.length > 0 && (
              <div className="fg-ttools">
                <div className="fg-ttools__l">
                  <Segment
                    label="보기"
                    options={VIEW_OPTIONS}
                    value={view}
                    onChange={(next) => setQuery({ view: next })}
                  />
                  {view === 'map' && (
                    <>
                      <Segment
                        label="표시 개수"
                        options={COUNT_OPTIONS}
                        value={String(query.count)}
                        onChange={(next) => setQuery({ count: toMapCount(next) })}
                      />
                      <FilterChip pressed={favOn} onClick={toggleFavorites}>
                        관심 테마
                      </FilterChip>
                    </>
                  )}
                  {view === 'table' && (
                    <Segment
                      label="정렬"
                      options={SORT_OPTIONS}
                      value={sort}
                      onChange={(next) => setQuery({ sort: next === 'change' ? null : next })}
                    />
                  )}
                </div>
                <span className="fg-ttools__cap">{caption}</span>
              </div>
            )}
            {body}
            <p className="fg-tfoot">{FOOTNOTE}</p>
          </section>
        </div>
        <aside className="fg-rail" aria-label="고른 테마">
          {panel}
          <Disclaimer />
        </aside>
      </div>
      <p className="fg-sr" aria-live="polite">
        {pick && selected?.id === pick.id ? `${selected.name} 골랐어요` : ''}
      </p>
    </div>
  )
}
