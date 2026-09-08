import { useMemo, useState } from 'react'
import { CircleAlert, RotateCw } from 'lucide-react'
import { NewsDetailModal } from '@/components/news/NewsDetailModal'
import { InsightStrip } from '@/components/theme/InsightStrip'
import { MarketHeadline } from '@/components/theme/MarketHeadline'
import { MarketSummaryStrip } from '@/components/theme/MarketSummaryStrip'
import { MoverFeed } from '@/components/theme/MoverFeed'
import { NewsSection } from '@/components/theme/NewsSection'
import { StockSection } from '@/components/theme/StockSection'
import { ThemeTopMovers } from '@/components/theme/ThemeTopMovers'
import { Treemap, type TreemapItem } from '@/components/theme/Treemap'
import { Button } from '@/components/ui/button'
import { FilterChip } from '@/components/ui/filter-chip'
import { toNewsItem } from '@/lib/apiMappers'
import { pickMovers } from '@/lib/briefing'
import { formatCompactKrw } from '@/lib/format'
import { selectTreemapThemes } from '@/lib/momentum'
import { useStocksCached } from '@/lib/queries/useStocksCached'
import { useThemeNews } from '@/lib/queries/useThemeNews'
import { useThemeStocks } from '@/lib/queries/useThemeStocks'
import { useThemes } from '@/lib/queries/useThemes'

const THEME_COUNTS = [20, 30, 40]

const LIST_CLASS =
  'h-[max(280px,31.667vw)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

export default function ThemeDashboardPage() {
  const [themeCount, setThemeCount] = useState(20)
  const [selectedName, setSelectedName] = useState('철강')
  const [openNewsId, setOpenNewsId] = useState<string | null>(null)

  const { data: themes, loading, error, refetch } = useThemes()
  const { data: allStocks, error: stocksError } = useStocksCached()

  const movers = useMemo(() => pickMovers(allStocks ?? [], 6), [allStocks])

  const treemapThemes = useMemo(
    () => selectTreemapThemes(themes ?? [], themeCount),
    [themes, themeCount],
  )
  const treemapItems: TreemapItem[] = useMemo(
    () =>
      treemapThemes
        .filter((t) => (t.marketCap ?? 0) > 0)
        .map((t) => ({
          id: t.name,
          name: t.name,
          change: t.change ?? 0,
          size: t.marketCap ?? 0,
          detail: `${formatCompactKrw(t.marketCap)}${
            t.topStocks[0] ? ` · ${t.topStocks[0].name}` : ''
          }`,
        })),
    [treemapThemes],
  )
  const selected = useMemo(
    () => (themes ?? []).find((t) => t.name === selectedName) ?? treemapThemes[0] ?? null,
    [themes, selectedName, treemapThemes],
  )
  const { data: themeStocks } = useThemeStocks(selected?.name ?? null)
  const { data: newsDetails } = useThemeNews(selected?.name ?? null)
  const news = useMemo(() => (newsDetails ?? []).map(toNewsItem), [newsDetails])

  return (
    <div className="page-container pb-12 pt-7">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-[9px]">
          <span className="flex h-7 items-center rounded-md bg-stock-up-soft px-2.5 text-xs font-semibold whitespace-nowrap text-stock-up">
            장마감
          </span>
          <span className="font-mono text-base font-medium tracking-[-0.4px] whitespace-nowrap text-foreground">
            2026-07-31 (금) 15:39:50
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="mr-[3px] text-caption whitespace-nowrap text-muted-foreground">
            표시 테마 수
          </span>
          {THEME_COUNTS.map((count) => (
            <FilterChip
              key={count}
              active={themeCount === count}
              onClick={() => setThemeCount(count)}
            >
              {count}개
            </FilterChip>
          ))}
        </div>
      </div>

      {loading && (
        <>
          <div className="mb-3 h-7 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mb-3 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <div className="h-40 animate-pulse rounded-2xl bg-muted" />
            <div className="h-40 animate-pulse rounded-2xl bg-muted" />
          </div>
          <div className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
          <div className="mb-3 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="h-40 animate-pulse rounded-2xl bg-muted" />
            <div className="h-40 animate-pulse rounded-2xl bg-muted" />
          </div>
          <div className="aspect-[1200/520] w-full animate-pulse rounded-2xl bg-muted" />
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-2xl bg-muted" />
            <div className="h-64 animate-pulse rounded-2xl bg-muted" />
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

      {!loading && !error && themes && (
        <>
          <MarketHeadline themes={themes} />

          <div className="mb-3 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <MarketSummaryStrip />
            <ThemeTopMovers themes={themes} onSelectTheme={setSelectedName} />
          </div>

          {!stocksError && (
            <div className="mb-3 flex flex-col gap-2">
              {/* 카드 밖 페이지 흐름의 제목 — StockSection h2와 같은 페이지 레벨 타이포 정본을 쓴다 */}
              <h2 className="text-lg font-medium tracking-[-0.5px] text-foreground">
                특징주
              </h2>
              {allStocks ? (
                <MoverFeed movers={movers} />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
                  ))}
                </div>
              )}
            </div>
          )}

          <InsightStrip
            themes={themes}
            onSelectTheme={setSelectedName}
            onOpenNews={setOpenNewsId}
          />

          <Treemap
            items={treemapItems}
            selectedId={selected?.name ?? null}
            onSelect={setSelectedName}
          />

          {selected && (
            <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-[1.08fr_0.92fr]">
              <div
                key={`stocks-${selected.name}`}
                className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 [&>section]:h-full"
              >
                <StockSection
                  name={selected.name}
                  change={selected.change}
                  stocks={themeStocks ?? []}
                  listClassName={LIST_CLASS}
                />
              </div>

              <div
                key={`news-${selected.name}`}
                className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:delay-75 motion-safe:[animation-fill-mode:backwards] [&>section]:h-full"
              >
                <NewsSection
                  title={`${selected.name} 관련 뉴스`}
                  items={news}
                  listClassName={LIST_CLASS}
                  onItemClick={(item) => setOpenNewsId(item.id)}
                />
              </div>
            </div>
          )}
        </>
      )}

      <NewsDetailModal
        newsId={openNewsId}
        onOpenChange={(open) => !open && setOpenNewsId(null)}
      />

      <p className="mt-5 text-caption text-muted-foreground">
        표시된 시세·등락률·뉴스는 데모용 시드 데이터입니다. 투자 판단의 근거로 사용할 수
        없습니다.
      </p>
    </div>
  )
}
