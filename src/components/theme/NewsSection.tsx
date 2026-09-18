import { useState } from 'react'
import type { NewsItem } from '@/lib/apiTypes'
import { cn } from '@/lib/utils'
import { FilterChip } from '@/components/ui/filter-chip'
import { NewsRelationBadge } from '@/components/news/NewsRelationBadge'

interface NewsSectionProps {
  title: string
  items: NewsItem[]
  className?: string
  listClassName?: string
  onItemClick?: (item: NewsItem) => void
  /** 제목 옆에 "분석만" 토글 칩을 붙여 관계 추출된(분석 뱃지) 뉴스만 걸러 볼 수 있게 한다 */
  relationFilter?: boolean
}

const ROW =
  'flex w-full flex-col items-start gap-0.5 border-b border-surface-inset py-2.5 text-left hover:bg-muted'

export function NewsSection({
  title,
  items,
  className,
  listClassName,
  onItemClick,
  relationFilter = false,
}: NewsSectionProps) {
  const [analyzedOnly, setAnalyzedOnly] = useState(false)
  const visible =
    relationFilter && analyzedOnly ? items.filter((item) => item.tripleExtracted === true) : items

  return (
    <section
      className={cn(
        'flex flex-col card-surface p-5',
        className,
      )}
    >
      <div className="mb-[9px] flex min-h-[30px] items-center justify-between gap-4">
        <h2 className="text-lg font-medium tracking-[-0.5px] text-foreground">{title}</h2>
        {relationFilter && (
          <FilterChip active={analyzedOnly} onClick={() => setAnalyzedOnly((v) => !v)}>
            분석만
          </FilterChip>
        )}
      </div>

      <div className="border-b border-border pb-1.5 text-caption text-muted-foreground">
        최신순 · {visible.length}건
      </div>

      <div className={cn(listClassName)}>
        {visible.map((item) => (
          <button key={item.id} type="button" onClick={() => onItemClick?.(item)} className={ROW}>
            <span className="flex w-full items-center gap-1.5">
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {item.title}
              </span>
              <NewsRelationBadge tripleExtracted={item.tripleExtracted} />
            </span>
            <span className="text-caption text-muted-foreground">{item.meta}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
