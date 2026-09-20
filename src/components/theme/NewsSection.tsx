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
  /** 카드 틀 없이 본문 안에 섹션으로 녹일 때 (뉴스 모달) — 제목도 작게 */
  plain?: boolean
}

// 왼쪽은 제목+메타 세로 묶음, 오른쪽 분석 뱃지는 행 전체 높이 기준 세로 중앙
const ROW =
  'flex w-full items-center gap-2 border-b border-surface-inset py-2.5 text-left hover:bg-muted'

export function NewsSection({
  title,
  items,
  className,
  listClassName,
  onItemClick,
  relationFilter = false,
  plain = false,
}: NewsSectionProps) {
  const [analyzedOnly, setAnalyzedOnly] = useState(false)
  const visible =
    relationFilter && analyzedOnly ? items.filter((item) => item.tripleExtracted === true) : items

  return (
    <section
      className={cn('flex flex-col', !plain && 'card-surface p-5', className)}
    >
      <div className="mb-[9px] flex min-h-[30px] items-center justify-between gap-4">
        <h2
          className={cn(
            'text-foreground',
            plain ? 'text-sm font-semibold' : 'text-lg font-medium tracking-[-0.5px]',
          )}
        >
          {title}
        </h2>
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
        {visible.map((item) => {
          const row = (
            <>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
                <span className="text-caption text-muted-foreground">{item.meta}</span>
              </span>
              <NewsRelationBadge tripleExtracted={item.tripleExtracted} />
            </>
          )
          // 미분석 뉴스는 상세에 그릴 관계가 없다 — 모달 대신 원문으로 바로 보낸다
          return item.tripleExtracted !== true && item.url ? (
            <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className={ROW}>
              {row}
            </a>
          ) : (
            <button key={item.id} type="button" onClick={() => onItemClick?.(item)} className={ROW}>
              {row}
            </button>
          )
        })}
      </div>
    </section>
  )
}