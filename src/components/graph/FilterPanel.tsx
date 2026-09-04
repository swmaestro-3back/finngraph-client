import {
  ALL_CATEGORIES,
  ALL_PREDICATES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  PREDICATE_LABELS,
  type NodeCategory,
  type Predicate,
} from '@/data/graphTypes'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FilterChip } from '@/components/ui/filter-chip'
import { cn } from '@/lib/utils'

interface Props {
  selectedCategories: Set<NodeCategory>
  onCategoriesChange: (v: Set<NodeCategory>) => void
  selectedPredicates: Set<Predicate>
  onPredicatesChange: (v: Set<Predicate>) => void
  /** 분류별 노드 수 */
  categoryCounts?: Partial<Record<NodeCategory, number>>
  /** 서술어별 간선 수 */
  predicateCounts?: Partial<Record<Predicate, number>>
}

/** Set에서 항목 하나를 토글한 새 Set */
function toggled<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set)
  if (!next.delete(value)) next.add(value)
  return next
}

/**
 * 노드 분류 필터 + 관계(서술어) 필터.
 * 여기서 KOSDAQ을 끄는 것은 받아 온 그래프에서 숨기는 것이다 — 서버에 다시 묻는 상단의 '범위'와는 다르다.
 */
export function FilterPanel({
  selectedCategories,
  onCategoriesChange,
  selectedPredicates,
  onPredicatesChange,
  categoryCounts = {},
  predicateCounts = {},
}: Props) {
  const allPredicatesOn = ALL_PREDICATES.every((p) => selectedPredicates.has(p))

  return (
    <div className="px-1">
      <h3 className="mb-2 text-body font-semibold tracking-[-0.2px] text-foreground">
        노드 종류
      </h3>
      <div className="flex flex-col gap-0.5">
        {ALL_CATEGORIES.map((category) => {
          const on = selectedCategories.has(category)
          return (
            <label key={category} className="flex cursor-pointer items-center gap-2 py-1.5">
              <Checkbox
                checked={on}
                onCheckedChange={() => onCategoriesChange(toggled(selectedCategories, category))}
                aria-label={CATEGORY_LABELS[category]}
              />
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: CATEGORY_COLORS[category] }}
              />
              <span className={cn('text-body', on ? 'text-foreground' : 'text-muted-foreground')}>
                {CATEGORY_LABELS[category]}
              </span>
              <span className="ml-auto rounded-full bg-surface-inset px-2 py-px font-mono text-caption text-muted-foreground">
                {categoryCounts[category] ?? 0}
              </span>
            </label>
          )
        })}
      </div>

      <div className="mt-5 mb-2 flex items-center justify-between">
        <h3 className="text-body font-semibold tracking-[-0.2px] text-foreground">관계</h3>
        <Button
          variant="link"
          size="xs"
          className="h-auto p-0"
          onClick={() => onPredicatesChange(new Set(allPredicatesOn ? [] : ALL_PREDICATES))}
        >
          {allPredicatesOn ? '모두 해제' : '모두 선택'}
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ALL_PREDICATES.map((predicate) => {
          const on = selectedPredicates.has(predicate)
          const count = predicateCounts[predicate] ?? 0
          return (
            <FilterChip
              key={predicate}
              tone="primary"
              active={on}
              title={predicate}
              onClick={() => onPredicatesChange(toggled(selectedPredicates, predicate))}
              className={cn('inline-flex items-center gap-1.5 rounded-full', count === 0 && 'opacity-45')}
            >
              {PREDICATE_LABELS[predicate]}
              <span className={cn('font-mono text-micro', on ? 'text-primary-foreground/85' : 'text-muted-foreground')}>
                {count}
              </span>
            </FilterChip>
          )
        })}
      </div>
    </div>
  )
}
