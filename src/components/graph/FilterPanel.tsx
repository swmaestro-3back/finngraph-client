import {
  NODE_COLORS,
  ENTITY_LABELS,
  PREDICATE_LABELS,
  ALL_ENTITY_TYPES,
  ALL_PREDICATES,
  type EntityType,
  type Predicate,
} from '@/data/graphTypes'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FilterChip } from '@/components/ui/filter-chip'
import { cn } from '@/lib/utils'

interface Props {
  selectedTypes: Set<EntityType>
  onTypesChange: (v: Set<EntityType>) => void
  selectedPredicates: Set<Predicate>
  onPredicatesChange: (v: Set<Predicate>) => void
  /** 종류별 노드 수 */
  typeCounts?: Partial<Record<EntityType, number>>
  /** 서술어별 간선 수 */
  predicateCounts?: Partial<Record<Predicate, number>>
}

/** Set에서 항목 하나를 토글한 새 Set */
function toggled<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set)
  if (!next.delete(value)) next.add(value)
  return next
}

/** 엔티티 종류 필터 + 관계(서술어) 필터 */
export function FilterPanel({
  selectedTypes,
  onTypesChange,
  selectedPredicates,
  onPredicatesChange,
  typeCounts = {},
  predicateCounts = {},
}: Props) {
  const allPredicatesOn = ALL_PREDICATES.every((p) => selectedPredicates.has(p))

  return (
    <div className="px-1">
      <h3 className="mb-2 text-body font-semibold tracking-[-0.2px] text-foreground">
        엔티티 종류
      </h3>
      <div className="flex flex-col gap-0.5">
        {ALL_ENTITY_TYPES.map((type) => {
          const on = selectedTypes.has(type)
          return (
            <label key={type} className="flex cursor-pointer items-center gap-2 py-1.5">
              <Checkbox
                checked={on}
                onCheckedChange={() => onTypesChange(toggled(selectedTypes, type))}
                aria-label={ENTITY_LABELS[type]}
              />
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: NODE_COLORS[type] }}
              />
              <span className={cn('text-body', on ? 'text-foreground' : 'text-muted-foreground')}>
                {ENTITY_LABELS[type]}
              </span>
              <span className="ml-auto rounded-full bg-surface-inset px-2 py-px font-mono text-caption text-muted-foreground">
                {typeCounts[type] ?? 0}
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
