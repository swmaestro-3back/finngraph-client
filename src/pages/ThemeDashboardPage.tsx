import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleAlert, Info, RotateCw } from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { NewsDetailModal } from '@/components/news/NewsDetailModal'
import { NewsSection } from '@/components/theme/NewsSection'
import { StockSection } from '@/components/theme/StockSection'
import { ThemeFocus } from '@/components/theme/ThemeFocus'
import { Treemap, type TreemapItem } from '@/components/theme/Treemap'
import { DashboardToolbar } from '@/components/theme/DashboardToolbar'
import { Button } from '@/components/ui/button'
import { toNewsItem } from '@/lib/apiMappers'
import type { ThemeRes } from '@/lib/apiTypes'
import { useIsMobile } from '@/hooks/use-mobile'
import { useAuth } from '@/lib/auth'
import { useAutoRefresh } from '@/lib/autoRefresh'
import { useFavorites } from '@/lib/favorites'
import { useHotThemes } from '@/lib/queries/useHotThemes'
import { useReferenceDate } from '@/lib/queries/useReferenceDate'
import { useThemeMarket } from '@/lib/queries/useThemeMarket'
import { useThemeNews } from '@/lib/queries/useThemeNews'
import { useThemeStocks } from '@/lib/queries/useThemeStocks'
import { coverageBanner, tileDetail, tileLabel } from '@/lib/themeMetrics'
import { normalizeSizes, tileSize } from '@/lib/treemapColor'

const DESKTOP_RATIO = 1200 / 520

const LIST_CLASS =
  'h-[max(280px,31.667vw)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

function largestTile(themes: ThemeRes[]): ThemeRes | null {
  let best: ThemeRes | null = null
  for (const t of themes) {
    if (best === null || Math.abs(t.change ?? 0) > Math.abs(best.change ?? 0)) best = t
  }
  return best
}

export default function ThemeDashboardPage() {
  const [themeCount, setThemeCount] = useState(20)
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [openNewsId, setOpenNewsId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const { status } = useAuth()
  const { has } = useFavorites()
  const isMobile = useIsMobile()

  const {
    data: hotThemes,
    loading,
    error,
    refetch,
    refresh: refreshHotThemes,
  } = useHotThemes(themeCount)
  const { data: market, loading: marketLoading, refresh: refreshMarket } = useThemeMarket()
  const baseDate = market?.baseDate ?? null
  const fallbackTicker =
    !marketLoading && baseDate === null ? (hotThemes?.[0]?.topStocks[0]?.ticker ?? null) : null
  const candleDate = useReferenceDate(fallbackTicker)
  const referenceDate = baseDate ?? candleDate
  const banner = coverageBanner(market?.coverage, hotThemes ? hotThemes.length : null)

  const treemapThemes = useMemo(() => {
    const list = hotThemes ?? []
    return onlyFavorites ? list.filter((t) => has('THEME', String(t.id))) : list
  }, [has, hotThemes, onlyFavorites])

  const treemapItems: TreemapItem[] = useMemo(() => {
    const sizes = normalizeSizes(treemapThemes.map((t) => tileSize(t.change)))
    return treemapThemes.map((t, i) => ({
      id: String(t.id),
      name: t.name,
      change: t.change ?? 0,
      size: sizes[i],
      detail: tileDetail(t) ?? undefined,
      label: tileLabel(t, baseDate),
    }))
  }, [treemapThemes, baseDate])

  const { maxUp, maxDown } = useMemo(() => {
    const ups = treemapThemes.map((t) => t.change ?? 0).filter((c) => c > 0)
    const downs = treemapThemes.map((t) => t.change ?? 0).filter((c) => c < 0)
    return {
      maxUp: ups.length ? Math.max(...ups) : null,
      maxDown: downs.length ? Math.max(...downs.map(Math.abs)) : null,
    }
  }, [treemapThemes])

  const [shownId, setShownId] = useState<number | null>(null)
  const requestedId = Number(searchParams.get('theme'))
  const selected = useMemo(
    () =>
      treemapThemes.find((t) => t.id === requestedId) ??
      treemapThemes.find((t) => t.id === shownId) ??
      largestTile(treemapThemes),
    [treemapThemes, requestedId, shownId],
  )
  const selectedId = selected?.id ?? null
  useEffect(() => {
    setShownId(selectedId)
  }, [selectedId])
  const selectTheme = (id: string) => {
    setSearchParams({ theme: id }, { replace: true })
  }
  const from = `${pathname}${search}`

  const { data: themeStocks, refresh: refreshThemeStocks } = useThemeStocks(selectedId)
  const { data: newsDetails } = useThemeNews(selectedId)
  const news = useMemo(() => (newsDetails ?? []).map(toNewsItem), [newsDetails])

  const refreshPrices = useCallback(() => {
    refreshHotThemes()
    refreshMarket()
    refreshThemeStocks()
  }, [refreshHotThemes, refreshMarket, refreshThemeStocks])
  useAutoRefresh(refreshPrices, market)

  return (
    <div className="page-container pb-12 pt-7">
      <DashboardToolbar
        shownCount={treemapThemes.length}
        market={market}
        referenceDate={referenceDate}
        themeCount={themeCount}
        maxUp={maxUp}
        maxDown={maxDown}
        onThemeCountChange={setThemeCount}
        onlyFavorites={onlyFavorites}
        onToggleFavorites={() => {
          if (status !== 'authenticated') {
            navigate('/login', { state: { next: '/' } })
            return
          }
          setOnlyFavorites((prev) => !prev)
        }}
      />

      {loading && (
        <>
          <div className="aspect-[1200/520] w-full animate-pulse rounded-2xl bg-muted" />
          <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="mt-5 h-32 animate-pulse rounded-3xl bg-muted" />
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="h-72 animate-pulse rounded-3xl bg-muted" />
            <div className="h-72 animate-pulse rounded-3xl bg-muted" />
          </div>
        </>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <CircleAlert className="size-8 text-muted-foreground" />
          <p className="text-body text-muted-foreground">
            {error.isRetryable
              ? '일시적으로 데이터를 불러올 수 없습니다.'
              : '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
          </p>
          {error.isRetryable && (
            <Button variant="outline" size="sm" onClick={refetch}>
              <RotateCw data-icon="inline-start" />
              다시 시도
            </Button>
          )}
        </div>
      )}

      {!loading && !error && hotThemes && (
        <>
          {banner && (
            <div
              role="status"
              className="mb-3 flex items-start gap-2 rounded-xl border border-border bg-muted px-4 py-3 text-body text-foreground-secondary break-keep"
            >
              <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>{banner}</span>
            </div>
          )}
          {onlyFavorites && treemapItems.length === 0 ? (
            <div className="card-surface flex h-[max(280px,31.667vw)] flex-col items-center justify-center gap-1 text-center">
              <p className="text-body text-foreground">
                오늘 상위 {hotThemes.length}개 테마 안에 관심 테마가 없어요
              </p>
              <p className="text-caption text-muted-foreground">
                표시 테마 수를 늘리거나 관심 테마를 더 담아보세요
              </p>
            </div>
          ) : (
            <Treemap
              items={treemapItems}
              ratio={isMobile ? 1 : DESKTOP_RATIO}
              selectedId={selected ? String(selected.id) : null}
              onSelect={selectTheme}
            />
          )}

          {selected && (
            <div
              key={`focus-${selected.id}`}
              className="mt-5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
            >
              <ThemeFocus theme={selected} stocks={themeStocks ?? []} from={from} />

              <div className="mt-4 grid items-stretch gap-4 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="min-w-0 [&>section]:h-full">
                  <StockSection stocks={themeStocks ?? []} from={from} listClassName={LIST_CLASS} />
                </div>
                <div className="min-w-0 [&>section]:h-full">
                  <NewsSection
                    title="관련 뉴스"
                    items={news}
                    listClassName={LIST_CLASS}
                    relationFilter
                    onItemClick={(item) => setOpenNewsId(item.id)}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <NewsDetailModal
        newsId={openNewsId}
        onOpenChange={(open) => !open && setOpenNewsId(null)}
      />
    </div>
  )
}
