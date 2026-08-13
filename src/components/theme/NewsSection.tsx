import type { NewsItem } from '@/data/news'
import { cn } from '@/lib/utils'

interface NewsSectionProps {
  /** 카드 제목 (예: "철강 관련 뉴스") */
  title: string
  items: NewsItem[]
  /** 섹션 래퍼 추가 클래스 (여백 등) */
  className?: string
  /** 리스트 영역 추가 클래스 (고정 높이·스크롤 등) */
  listClassName?: string
  /** 뉴스 한 줄 클릭 — 없으면 클릭해도 아무 일도 일어나지 않는다 */
  onItemClick?: (item: NewsItem) => void
}

const ROW =
  'grid min-h-[48px] w-full grid-cols-[1fr_124px] items-center gap-3 border-b border-surface-inset py-1 text-left hover:bg-muted'

/** 종목 리스트와 동일한 한 줄 Row 형태의 뉴스 리스트 카드 */
export function NewsSection({
  title,
  items,
  className,
  listClassName,
  onItemClick,
}: NewsSectionProps) {
  return (
    <section
      className={cn(
        'flex flex-col rounded-3xl border border-border bg-background p-5',
        className,
      )}
    >
      <h2 className="mb-[9px] flex min-h-[30px] items-center text-lg font-medium tracking-[-0.5px] text-foreground">
        {title}
      </h2>

      <div className="grid grid-cols-[1fr_124px] gap-3 border-b border-border pb-1.5 text-[11px] text-muted-foreground">
        <span>최신순 · {items.length}건</span>
        <span className="text-right">출처 · 시간</span>
      </div>

      <div className={cn(listClassName)}>
        {items.map((item) => {
          const content = (
            <>
              <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
              <span className="truncate text-right text-[11px] text-muted-foreground">
                {item.meta}
              </span>
            </>
          )
          return onItemClick ? (
            <button key={item.id} type="button" onClick={() => onItemClick(item)} className={ROW}>
              {content}
            </button>
          ) : (
            <a key={item.id} href="#" onClick={(e) => e.preventDefault()} className={ROW}>
              {content}
            </a>
          )
        })}
      </div>
    </section>
  )
}
