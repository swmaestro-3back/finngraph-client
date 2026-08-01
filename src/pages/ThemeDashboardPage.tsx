import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Treemap } from '@/components/theme/Treemap'
import { getThemeNews } from '@/data/news'
import { selectTreemapThemes, getThemeById } from '@/data/themes'
import { changeColorClass, formatChange, formatPrice } from '@/lib/format'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

const THEME_COUNTS = [20, 30, 40]

export default function ThemeDashboardPage() {
  const { pathname } = useLocation()
  const [themeCount, setThemeCount] = useState(20)
  const [selectedId, setSelectedId] = useState('철강')

  const treemapThemes = useMemo(() => selectTreemapThemes(themeCount), [themeCount])
  const selected = getThemeById(selectedId) ?? treemapThemes[0]
  const news = useMemo(
    () => getThemeNews(selected.id, selected.name, selected.stocks[0]?.name ?? ''),
    [selected],
  )

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
            <button
              key={count}
              type="button"
              onClick={() => setThemeCount(count)}
              className={cn(
                'cursor-pointer rounded-full border px-3 py-[7px] text-xs font-medium leading-none',
                themeCount === count
                  ? 'border-foreground bg-foreground text-white'
                  : 'border-border bg-transparent text-[#5b616e]',
              )}
            >
              {count}개
            </button>
          ))}
        </div>
      </div>

      {/* 트리맵 */}
      <Treemap items={treemapThemes} selectedId={selectedId} onSelect={setSelectedId} />

      {/* 하단 2컬럼 */}
      <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        {/* 선택 테마 종목 리스트 */}
        <section className="rounded-3xl border border-border bg-background p-5">
          <div className="mb-[9px] flex min-h-[30px] items-center justify-between">
            <div className="flex items-baseline gap-[9px]">
              <h2 className="text-lg font-medium tracking-[-0.5px] text-foreground">
                {selected.name}
              </h2>
              <span
                className={cn(
                  'font-mono text-base font-medium tracking-[-0.5px]',
                  changeColorClass(selected.change),
                )}
              >
                {formatChange(selected.change)}
              </span>
            </div>
            <Link
              to={`/theme/${selected.id}`}
              state={fromState(pathname)}
              className="text-xs font-semibold leading-none text-primary"
            >
              테마 상세 →
            </Link>
          </div>

          <div className="grid grid-cols-[1fr_116px_84px] gap-3 border-b border-border pb-1.5 text-[11px] text-muted-foreground">
            <span>
              종목명 · {selected.stocks.length}개 종목
            </span>
            <span className="text-right">현재가</span>
            <span className="text-right">등락률</span>
          </div>

          <div className="h-[max(280px,31.667vw)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {selected.stocks.map((stock) => (
              <Link
                key={stock.code}
                to={`/stock/${stock.code}`}
                state={fromState(pathname)}
                className="grid min-h-[38px] grid-cols-[1fr_116px_84px] items-center gap-3 border-b border-surface-inset py-1 hover:bg-muted"
              >
                <span className="flex items-center gap-[9px] overflow-hidden">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {stock.name}
                  </span>
                  <span className="font-mono text-[11px] text-[#a8acb3]">{stock.code}</span>
                </span>
                <span className="text-right font-mono text-sm font-medium text-foreground">
                  {formatPrice(stock.price)}
                </span>
                <span
                  className={cn(
                    'text-right font-mono text-xs font-medium',
                    changeColorClass(stock.change),
                  )}
                >
                  {formatChange(stock.change)}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 관련 뉴스 */}
        <section className="flex flex-col rounded-3xl border border-border bg-muted p-5">
          <h2 className="mb-[9px] flex min-h-[30px] items-center text-lg font-medium tracking-[-0.5px] text-foreground">
            {selected.name} 관련 뉴스
          </h2>
          <div className="border-b border-border pb-1.5 text-[11px] text-muted-foreground">
            최신순 · {news.length}건
          </div>
          <div className="mt-1.5 flex h-[max(280px,31.667vw)] flex-col gap-1.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {news.map((item) => (
              <a
                key={item.id}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="flex flex-col gap-1.5 rounded-xl border border-border bg-background p-[9px] transition-colors hover:border-[#a8acb3]"
              >
                <span className="text-sm font-medium leading-[1.45] text-foreground [text-wrap:pretty]">
                  {item.title}
                </span>
                <span className="text-[11px] text-muted-foreground">{item.meta}</span>
              </a>
            ))}
          </div>
        </section>
      </div>

      <p className="mt-5 text-[11px] text-muted-foreground">
        표시된 시세·등락률·뉴스는 데모용 예시 데이터입니다. 투자 판단의 근거로 사용할 수
        없습니다.
      </p>
    </div>
  )
}
