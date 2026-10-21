import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronLeft, CircleHelp, Pencil } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { FavoriteRow } from '@/components/favorite/FavoriteRow'
import { FolderCards } from '@/components/favorite/FolderCards'
import { FolderMenu } from '@/components/favorite/FolderMenu'
import { FolderNameDialog } from '@/components/favorite/FolderNameDialog'
import { FolderRail } from '@/components/favorite/FolderRail'
import { FolderReturnsChart } from '@/components/favorite/FolderReturnsChart'
import { MineGuide } from '@/components/favorite/MineGuide'
import { ThemeCards } from '@/components/favorite/ThemeCards'
import { Button, ButtonLink } from '@/components/fg/Button'
import { FilterChip } from '@/components/fg/FilterChip'
import { IconButton } from '@/components/fg/IconButton'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { getData } from '@/lib/api'
import type { CalendarEventRes, CalendarRes, FavoriteItemRes } from '@/lib/apiTypes'
import { kstToday } from '@/lib/calendar'
import { useFavorites } from '@/lib/favorites'
import {
  ALL_VIEW,
  ITEM_SORTS,
  SMART_HINT,
  SMART_KEYS,
  SMART_LABEL,
  SMART_TONE,
  averageChange,
  eventWindow,
  memberStocks,
  moveCount,
  parseView,
  signalOf,
  smartMatches,
  sortItems,
  viewParam,
  type FavoriteView,
  type ItemSort,
  type SmartKey,
  type StockSignal,
} from '@/lib/fg/folders'
import { toneClass } from '@/lib/fg/format'
import {
  closeMineGuide,
  folderViewed,
  guideState,
  markFolderViewed,
  mineGuideClosed,
  reopenMineGuide,
} from '@/lib/fg/mineGuide'
import { motionAllowed } from '@/lib/fg/motion'
import { themeBasisLabel } from '@/lib/fg/themes'
import { useContentSwap } from '@/lib/fg/useContentSwap'
import { formatChange } from '@/lib/format'
import { useKeyed } from '@/lib/queries/useKeyed'
import { loadLatestIssues } from '@/lib/queries/useStockIssues'
import { stockIndexOf, useStocksCached } from '@/lib/queries/useStocksCached'
import { useThemeMarket } from '@/lib/queries/useThemeMarket'
import { cn } from '@/lib/utils'

type Dialog = { mode: 'create' } | { mode: 'rename'; id: number; name: string } | null

function loadIssues(joined: string) {
  return loadLatestIssues(joined.split(','))
}

function loadEvents(joined: string): Promise<CalendarEventRes[]> {
  const [from, to] = joined.split('|')
  return getData<CalendarRes>('/v1/me/calendar', { from, to }).then((res) => res.events)
}

function TodayLine({ items }: { items: readonly FavoriteItemRes[] }) {
  const move = moveCount(items)
  if (move.total === 0) return <>오늘 시세가 있는 관심 종목이 없어요</>
  return (
    <>
      {`관심 종목 ${move.total}개 중 오늘 `}
      <b className="fg-up">{`${move.up}개 상승`}</b>
      {' · '}
      <b className="fg-down">{`${move.down}개 하락`}</b>
      {move.flat > 0 && ` · ${move.flat}개 보합`}
    </>
  )
}

function PanelSummary({ items }: { items: readonly FavoriteItemRes[] }) {
  const average = averageChange(items)
  const move = moveCount(items)
  if (average === null) return <>오늘 시세가 있는 종목이 없어요</>
  return (
    <>
      {'오늘 '}
      <b className={toneClass(average)}>{formatChange(average)}</b>
      {` · ${move.up}개 상승 · ${move.down}개 하락 · 담은 종목 평균`}
    </>
  )
}

export default function MyFavoritesPage() {
  const favorites = useFavorites()
  const { items, folders, count, limit, ready, error, folderLimit, refresh, openPrompt, removeFromFolder } = favorites
  const [params, setParams] = useSearchParams()
  const [today] = useState(() => kstToday(new Date()))
  const [sort, setSort] = useState<ItemSort>('change')
  const [editingView, setEditingView] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [guideOpen, setGuideOpen] = useState(() => !mineGuideClosed())
  const [guideAsked, setGuideAsked] = useState(false)
  const [guidePinned, setGuidePinned] = useState(false)
  const [viewed, setViewed] = useState(() => folderViewed())
  const market = useThemeMarket()
  const basis = themeBasisLabel(market.data)

  const folderIds = useMemo(() => folders.map((folder) => folder.id), [folders])
  const viewRaw = params.get('view')
  const view = useMemo(() => parseView(viewRaw, folderIds), [viewRaw, folderIds])
  const viewKey = viewParam(view) ?? 'all'
  const folder = view.kind === 'folder' ? (folders.find((entry) => entry.id === view.id) ?? null) : null
  const editing = editingView === viewKey
  const panelRef = useRef<HTMLElement>(null)
  const railRef = useRef<HTMLElement>(null)

  const select = useCallback(
    (next: FavoriteView) => {
      setParams(
        (prev) => {
          const draft = new URLSearchParams(prev)
          const param = viewParam(next)
          if (param) draft.set('view', param)
          else draft.delete('view')
          return draft
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const stockTickers = useMemo(
    () => [...new Set(items.filter((item) => item.type === 'STOCK').map((item) => item.key))].sort(),
    [items],
  )
  const stockItems = useMemo(() => items.filter((item) => item.type === 'STOCK'), [items])
  const themeItems = useMemo(() => items.filter((item) => item.type === 'THEME'), [items])

  const viewing = folder !== null && folder.count > 0
  if (viewing && !viewed) setViewed(true)
  useEffect(() => {
    if (viewing) markFolderViewed()
  }, [viewing])

  const guide = guideState({
    stocks: stockItems.length,
    folders: folders.length,
    filled: folders.some((entry) => entry.count > 0),
    viewed,
  })
  const guideDone = guide.every((step) => step.done)
  const showGuide = ready && !error && guideOpen && (guideAsked || guidePinned || !guideDone)
  if (showGuide && !guideDone && !guidePinned) setGuidePinned(true)

  const closeGuide = () => {
    closeMineGuide()
    setGuideOpen(false)
    setGuideAsked(false)
    setGuidePinned(false)
  }

  const askGuide = () => {
    reopenMineGuide()
    setGuideOpen(true)
    setGuideAsked(true)
  }

  const toPanel = () => {
    window.requestAnimationFrame(() =>
      panelRef.current?.scrollIntoView({ behavior: motionAllowed() ? 'smooth' : 'auto', block: 'start' }),
    )
  }

  const guideFill = () => {
    select(ALL_VIEW)
    setEditingView('all')
    toPanel()
  }

  const guideOpenFolder = () => {
    const target = folders.find((entry) => entry.count > 0)
    if (target) select({ kind: 'folder', id: target.id })
    toPanel()
  }
  const tickerKey = stockTickers.join(',')
  const span = eventWindow(today)
  const issues = useKeyed(tickerKey === '' ? null : tickerKey, loadIssues)
  const events = useKeyed(tickerKey === '' ? null : `${span.from}|${span.to}|${tickerKey}`, loadEvents)
  const stocks = useStocksCached(stockTickers.length > 0)
  const quotes = stockIndexOf(stocks.data)

  const signals = useMemo(() => {
    const context = { issues: issues.data, events: events.data, quotes, today }
    return new Map<string, StockSignal>(stockTickers.map((ticker) => [ticker, signalOf(ticker, context)]))
  }, [issues.data, events.data, quotes, today, stockTickers])

  const smartReady: Record<SmartKey, boolean> = {
    issue: issues.data !== null,
    event: events.data !== null,
    high: quotes !== null,
    drop: true,
  }

  const smartCounts = useMemo(() => {
    const counts = {} as Record<SmartKey, number>
    for (const key of SMART_KEYS) {
      counts[key] = stockItems.filter((item) => smartMatches(item, key, signals.get(item.key) ?? null)).length
    }
    return counts
  }, [stockItems, signals])

  const viewItems = useMemo(() => {
    if (view.kind === 'folder') return stockItems.filter((item) => item.folderIds.includes(view.id))
    if (view.kind === 'smart') return stockItems.filter((item) => smartMatches(item, view.key, signals.get(item.key) ?? null))
    return stockItems
  }, [stockItems, view, signals])
  const sorted = useMemo(() => sortItems(viewItems, sort), [viewItems, sort])
  const members = useMemo(() => memberStocks(viewItems), [viewItems])
  const memberKey = useMemo(() => members.map((member) => member.ticker).sort().join(','), [members])

  useContentSwap(panelRef, viewKey)
  useContentSwap(railRef, viewKey)

  const organize = useCallback(
    (item: FavoriteItemRes, anchor: HTMLElement) => {
      openPrompt(item.type, item.key, { label: item.stock?.name ?? item.theme?.name ?? item.key, anchor })
    },
    [openPrompt],
  )

  const takeOut = useCallback(
    (item: FavoriteItemRes) => {
      if (folder) void removeFromFolder(folder.id, item.type, item.key)
    },
    [folder, removeFromFolder],
  )

  const title = folder ? folder.name : view.kind === 'smart' ? SMART_LABEL[view.key] : '전체 관심'

  let body
  if (error && !ready) {
    body = (
      <section className="fg-section">
        <StateBlock
          kind="error"
          title="관심 목록을 불러오지 못했어요"
          action={
            <Button size="sm" onClick={() => void refresh().catch(() => {})}>
              다시 시도
            </Button>
          }
        />
      </section>
    )
  } else if (!ready) {
    body = (
      <div className="fg-mine__skel" aria-hidden="true">
        <Skeleton height={160} shape="card" />
        <Skeleton height={68} shape="card" />
        <Skeleton height={420} shape="card" />
      </div>
    )
  } else if (items.length === 0 && folders.length === 0) {
    body = showGuide ? null : (
      <section className="fg-section">
        <StateBlock
          kind="empty"
          title="아직 담은 관심이 없어요"
          description="종목이나 테마의 별표를 누르면 여기에 모이고, 나만의 테마로 묶을 수 있어요"
          action={
            <ButtonLink size="sm" to="/stocks">
              종목 목록에서 찾아보기
            </ButtonLink>
          }
        />
      </section>
    )
  } else {
    body = (
      <>
        <section className="fg-section fg-mine__folders" aria-labelledby="fg-mine-folders">
          <div className="fg-section__head">
            <h2 id="fg-mine-folders" className="fg-section__title">
              내가 만든 테마
              <span className="fg-mine__count fg-num">{`${folders.length} / ${folderLimit}`}</span>
            </h2>
            <FilterChip pressed={view.kind === 'all'} count={stockItems.length} onClick={() => select(ALL_VIEW)}>
              전체 관심
            </FilterChip>
          </div>
          <FolderCards
            folders={folders}
            items={items}
            view={view}
            signals={signals}
            today={today}
            canCreate={folders.length < folderLimit}
            folderLimit={folderLimit}
            onCreate={() => setDialog({ mode: 'create' })}
          />
        </section>

        {themeItems.length > 0 && (
          <section className="fg-section" aria-labelledby="fg-mine-themes">
            <div className="fg-section__head">
              <h2 id="fg-mine-themes" className="fg-section__title">
                관심 테마
                <span className="fg-mine__count fg-num">{themeItems.length}</span>
              </h2>
              <span className="fg-mine__smartnote">테마 페이지에서 별을 누르면 여기에 모여요</span>
            </div>
            <ThemeCards items={themeItems} />
          </section>
        )}

        <section className="fg-section fg-mine__smart" aria-labelledby="fg-mine-smart">
          <div className="fg-section__head">
            <h2 id="fg-mine-smart" className="fg-section__title">
              저절로 모이는 관심
            </h2>
            <span className="fg-mine__smartnote">{`관심 종목 ${stockItems.length}개 안에서 조건에 맞는 종목이 매일 바뀌어요`}</span>
          </div>
          <div className="fg-chiprow fg-mine__chips" role="group" aria-label="저절로 모이는 관심">
            {SMART_KEYS.map((key) => {
              const pressed = view.kind === 'smart' && view.key === key
              const counted = smartReady[key]
              return (
                <FilterChip
                  key={key}
                  className="fg-mine__chip"
                  pressed={pressed}
                  count={counted ? smartCounts[key] : null}
                  disabled={counted && smartCounts[key] === 0 && !pressed}
                  onClick={() => select(pressed ? ALL_VIEW : { kind: 'smart', key })}
                >
                  <i className={cn('fg-mine__dot', `fg-mine__dot--${SMART_TONE[key]}`)} aria-hidden="true" />
                  {SMART_LABEL[key]}
                </FilterChip>
              )
            })}
          </div>
        </section>

        <div className="fg-grid fg-mine__grid">
          <section ref={panelRef} className="fg-section fg-mine__panel" aria-labelledby="fg-mine-panel">
            <div className="fg-section__head fg-mine__kick">
              {view.kind !== 'all' ? (
                <button type="button" className="fg-mine__back" onClick={() => select(ALL_VIEW)}>
                  <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
                  전체 관심
                  <span className="fg-num">{stockItems.length}</span>
                </button>
              ) : (
                <span className="fg-section__title">관심 목록</span>
              )}
              <div className="fg-mine__panelacts">
                {folder && (
                  <FolderMenu
                    folder={folder}
                    onRename={() => setDialog({ mode: 'rename', id: folder.id, name: folder.name })}
                    onDeleted={() => select(ALL_VIEW)}
                  />
                )}
              </div>
            </div>
            <div className="fg-mine__paneltitles">
              <h2 id="fg-mine-panel" className="fg-mine__h2">
                {title}
              </h2>
              <p className="fg-mine__panelsub fg-num">
                {view.kind === 'smart' ? SMART_HINT[view.key] : <PanelSummary items={viewItems} />}
              </p>
            </div>

            {folder ? (
              <FolderReturnsChart folderId={folder.id} name={folder.name} memberKey={memberKey} />
            ) : (
              view.kind === 'all' &&
              members.length > 0 && <FolderReturnsChart folderId={null} name="전체 관심" memberKey={memberKey} />
            )}

            <div className="fg-mine__toolbar">
              <span className="fg-mine__listcount fg-num">
                {view.kind === 'smart' ? `조건에 맞는 종목 ${viewItems.length}개` : `담은 종목 ${viewItems.length}`}
              </span>
              <div className="fg-mine__tools">
                {viewItems.length > 0 && (
                  <Button
                    size="sm"
                    variant={editing ? 'primary' : 'secondary'}
                    aria-pressed={editing}
                    onClick={() => setEditingView(editing ? null : viewKey)}
                  >
                    {editing ? (
                      <Check size={16} strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
                    )}
                    {editing ? '완료' : '편집'}
                  </Button>
                )}
                <label className="fg-tsort">
                  <span className="fg-sr">정렬</span>
                  <select value={sort} onChange={(event) => setSort(event.target.value as ItemSort)}>
                    {ITEM_SORTS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
                </label>
              </div>
            </div>

            {editing && (
              <p className="fg-mine__edithint">
                {folder
                  ? '폴더 단추로 다른 테마에도 담고, X로 이 테마에서 뺄 수 있어요. 관심은 그대로 남아요'
                  : '폴더 단추를 눌러 나만의 테마에 담을 수 있어요'}
              </p>
            )}

            {sorted.length === 0 ? (
              <StateBlock
                kind="empty"
                title={
                  folder
                    ? '아직 담은 종목이 없어요'
                    : view.kind === 'all'
                      ? '아직 담은 관심 종목이 없어요'
                      : '조건에 맞는 관심 종목이 없어요'
                }
                description={
                  folder
                    ? '전체 관심에서 편집을 눌러 폴더 단추로 담거나, 종목의 별표를 눌러 담아 보세요'
                    : view.kind === 'all'
                      ? '종목의 별표를 누르면 여기에 모이고, 나만의 테마로 묶을 수 있어요'
                      : undefined
                }
                action={
                  folder ? (
                    <Button size="sm" onClick={() => select(ALL_VIEW)}>
                      전체 관심 보기
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <ul className="fg-mine__list">
                {sorted.map((item) => (
                  <FavoriteRow
                    key={`${item.type}:${item.key}`}
                    item={item}
                    signal={item.type === 'STOCK' ? (signals.get(item.key) ?? null) : null}
                    today={today}
                    folder={folder}
                    editing={editing}
                    onOrganize={organize}
                    onTakeOut={takeOut}
                  />
                ))}
              </ul>
            )}
          </section>
          <aside ref={railRef} className="fg-rail fg-mine__rail" aria-label={`${title}과 이어진 기업`}>
            <FolderRail members={members} folder={folder} />
          </aside>
        </div>
      </>
    )
  }

  return (
    <div className="fg-main fg-wrap fg-mine">
      <header className="fg-pagehead">
        <div>
          <div className="fg-mine__titlerow">
            <h1 className="fg-pagehead__title">나만의 테마</h1>
            {ready && !showGuide && (
              <IconButton label="시작 안내 보기" title="시작 안내 보기" className="fg-mine__help" onClick={askGuide}>
                <CircleHelp size={18} strokeWidth={1.75} aria-hidden="true" />
              </IconButton>
            )}
          </div>
          {ready && (
            <p className="fg-pagehead__sub fg-mine__summary fg-num">
              <TodayLine items={stockItems} />
            </p>
          )}
        </div>
        {ready && (
          <span className="fg-pagehead__meta fg-num">
            {`관심 ${count} / ${limit}`}
            {basis && ` · ${basis}`}
          </span>
        )}
      </header>

      {showGuide && (
        <MineGuide
          steps={guide}
          onClose={closeGuide}
          onCreate={() => setDialog({ mode: 'create' })}
          onFill={guideFill}
          onOpen={guideOpenFolder}
        />
      )}

      {body}

      {dialog && (
        <FolderNameDialog
          mode={dialog.mode}
          folder={dialog.mode === 'rename' ? { id: dialog.id, name: dialog.name } : null}
          onClose={() => setDialog(null)}
          onCreated={(id) => select({ kind: 'folder', id })}
        />
      )}
    </div>
  )
}
