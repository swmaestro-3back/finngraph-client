import { useMemo, useState } from 'react'
import { NewsDetailModal } from '@/components/news/NewsDetailModal'
import { InsightStrip } from '@/components/theme/InsightStrip'
import { NewsSection } from '@/components/theme/NewsSection'
import { StockSection } from '@/components/theme/StockSection'
import { Treemap } from '@/components/theme/Treemap'
import { FilterChip } from '@/components/ui/filter-chip'
import { getThemeNews } from '@/data/news'
import { selectTreemapThemes, getThemeById } from '@/data/themes'

const THEME_COUNTS = [20, 30, 40]

const LIST_CLASS =
  'h-[max(280px,31.667vw)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

export default function ThemeDashboardPage() {
  const [themeCount, setThemeCount] = useState(20)
  const [selectedId, setSelectedId] = useState('철강')
  const [openNewsId, setOpenNewsId] = useState<string | null>(null)

  const treemapThemes = useMemo(() => selectTreemapThemes(themeCount), [themeCount])
  const selected = getThemeById(selectedId) ?? treemapThemes[0]
  const news = useMemo(() => getThemeNews(selected.id), [selected])

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

      <InsightStrip onSelectTheme={setSelectedId} onOpenNews={setOpenNewsId} />

      <Treemap items={treemapThemes} selectedId={selectedId} onSelect={setSelectedId} />

      <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        <div
          key={`stocks-${selected.id}`}
          className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 [&>section]:h-full"
        >
          <StockSection theme={selected} listClassName={LIST_CLASS} />
        </div>

        <div
          key={`news-${selected.id}`}
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

      <NewsDetailModal
        newsId={openNewsId}
        onOpenChange={(open) => !open && setOpenNewsId(null)}
      />

      <p className="mt-5 text-caption text-muted-foreground">
        표시된 시세·등락률·뉴스는 데모용 예시 데이터입니다. 투자 판단의 근거로 사용할 수
        없습니다.
      </p>
    </div>
  )
}
