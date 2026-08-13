import { useMemo, useState } from 'react'
import { NewsDetailModal } from '@/components/news/NewsDetailModal'
import { NewsSection } from '@/components/theme/NewsSection'
import { StockSection } from '@/components/theme/StockSection'
import { Treemap } from '@/components/theme/Treemap'
import { FilterChip } from '@/components/ui/filter-chip'
import { getThemeNews } from '@/data/news'
import { selectTreemapThemes, getThemeById } from '@/data/themes'

const THEME_COUNTS = [20, 30, 40]

/** 종목 리스트·뉴스 카드가 같은 높이를 쓰도록 공유하는 스크롤 영역 클래스 */
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
      {/* 헤더 행: 장마감 뱃지 + 타임스탬프 / 표시 테마 수 pill */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-[9px]">
          <span className="flex h-7 items-center rounded-md bg-[#fdeaec] px-2.5 text-xs font-semibold whitespace-nowrap text-stock-up">
            장마감
          </span>
          <span className="font-mono text-base font-medium tracking-[-0.4px] whitespace-nowrap text-foreground">
            2026-07-31 (금) 15:39:50
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="mr-[3px] text-[11px] whitespace-nowrap text-muted-foreground">
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

      {/* 트리맵 */}
      <Treemap items={treemapThemes} selectedId={selectedId} onSelect={setSelectedId} />

      {/* 하단 2컬럼 */}
      <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        {/* 선택 테마 종목 리스트 */}
        <StockSection theme={selected} listClassName={LIST_CLASS} />

        {/* 관련 뉴스 */}
        <NewsSection
          title={`${selected.name} 관련 뉴스`}
          items={news}
          listClassName={LIST_CLASS}
          onItemClick={(item) => setOpenNewsId(item.id)}
        />
      </div>

      <NewsDetailModal
        newsId={openNewsId}
        onOpenChange={(open) => !open && setOpenNewsId(null)}
      />

      <p className="mt-5 text-[11px] text-muted-foreground">
        표시된 시세·등락률·뉴스는 데모용 예시 데이터입니다. 투자 판단의 근거로 사용할 수
        없습니다.
      </p>
    </div>
  )
}
