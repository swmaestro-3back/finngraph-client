import { useMemo, useState } from 'react'
import { CircleAlert, RotateCw } from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { NewsDetailModal } from '@/components/news/NewsDetailModal'
import { NewsSection } from '@/components/theme/NewsSection'
import { StockSection } from '@/components/theme/StockSection'
import { ThemeFocus } from '@/components/theme/ThemeFocus'
import { Treemap, type TreemapItem } from '@/components/theme/Treemap'
import { TreemapLegend } from '@/components/theme/TreemapLegend'
import { TreemapToolbar } from '@/components/theme/TreemapToolbar'
import { Button } from '@/components/ui/button'
import { toNewsItem } from '@/lib/apiMappers'
import type { ThemeRes } from '@/lib/apiTypes'
import { useAuth } from '@/lib/auth'
import { useFavorites } from '@/lib/favorites'
import { formatCompactKrw } from '@/lib/format'
import { useHotThemes } from '@/lib/queries/useHotThemes'
import { useReferenceDate } from '@/lib/queries/useReferenceDate'
import { useThemeNews } from '@/lib/queries/useThemeNews'
import { useThemeStocks } from '@/lib/queries/useThemeStocks'

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

  const { data: hotThemes, loading, error, refetch } = useHotThemes(themeCount)
  const referenceDate = useReferenceDate(hotThemes?.[0]?.topStocks[0]?.ticker ?? null)

  const treemapThemes = useMemo(() => {
    const list = hotThemes ?? []
    return onlyFavorites ? list.filter((t) => has('THEME', String(t.id))) : list
  }, [has, hotThemes, onlyFavorites])

  const treemapItems: TreemapItem[] = useMemo(
    () =>
      treemapThemes.map((t) => ({
        id: String(t.id),
        name: t.name,
        change: t.change ?? 0,
        size: Math.max(Math.abs(t.change ?? 0), 0.5),
        detail: `${formatCompactKrw(t.marketCap)}${t.topStocks[0] ? ` · ${t.topStocks[0].name}` : ''}`,
      })),
    [treemapThemes],
  )

  const { maxUp, maxDown } = useMemo(() => {
    const ups = treemapThemes.map((t) => t.change ?? 0).filter((c) => c > 0)
    const downs = treemapThemes.map((t) => t.change ?? 0).filter((c) => c < 0)
    return {
      maxUp: ups.length ? Math.max(...ups) : null,
      maxDown: downs.length ? Math.max(...downs.map(Math.abs)) : null,
    }
  }, [treemapThemes])

  const requestedId = Number(searchParams.get('theme'))
  const selected = useMemo(
    () => treemapThemes.find((t) => t.id === requestedId) ?? largestTile(treemapThemes),
    [treemapThemes, requestedId],
  )
  const selectTheme = (id: string) => {
    setSearchParams({ theme: id }, { replace: true })
  }
  const from = `${pathname}${search}`

  const { data: themeStocks } = useThemeStocks(selected?.id ?? null)
  const { data: newsDetails } = useThemeNews(selected?.id ?? null)
  const news = useMemo(() => (newsDetails ?? []).map(toNewsItem), [newsDetails])

  return (
    <div className="page-container pb-12 pt-7">
      <TreemapToolbar
        shownCount={treemapThemes.length}
        referenceDate={referenceDate}
        themeCount={themeCount}
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
            <>
              <Treemap
                items={treemapItems}
                selectedId={selected ? String(selected.id) : null}
                onSelect={selectTheme}
              />
              <TreemapLegend maxUp={maxUp} maxDown={maxDown} />
            </>
          )}

          {selected && (
            <div
              key={`focus-${selected.id}`}
              className="mt-5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
            >
              <ThemeFocus theme={selected} from={from} />

              <div className="mt-4 grid items-stretch gap-4 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="[&>section]:h-full">
                  <StockSection stocks={themeStocks ?? []} from={from} listClassName={LIST_CLASS} />
                </div>
                <div className="[&>section]:h-full">
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
