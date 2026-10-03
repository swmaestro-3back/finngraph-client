import { useState } from 'react'
import { List, X } from 'lucide-react'
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
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

/** 범례 항목에 올렸을 때 캔버스에서 잠깐 켜 볼 대상 */
export type LegendPreview =
  | { kind: 'category'; category: NodeCategory }
  | { kind: 'predicate'; predicate: Predicate }

interface Props {
  selectedCategories: Set<NodeCategory>
  onCategoriesChange: (v: Set<NodeCategory>) => void
  selectedPredicates: Set<Predicate>
  onPredicatesChange: (v: Set<Predicate>) => void
  /** 분류별 노드 수 (필터 전 전체) — 0인 분류는 범례에 나오지 않는다 */
  categoryCounts: Partial<Record<NodeCategory, number>>
  /** 관계별 간선 수 (필터 전 전체) */
  predicateCounts: Partial<Record<Predicate, number>>
  /** 켜져 있는 항목에 올리면 캔버스에서 그 종류만 켠다 — 떠나면 null */
  onPreview?: (preview: LegendPreview | null) => void
}

/**
 * 범례에서만 쓰는 관계 이름. 노드 분류에도 "이벤트"가 있어 같은 낱말이 두 줄에 나란히 서면 헷갈린다 —
 * 간선 쪽은 무엇을 잇는지로 부른다.
 */
const PREDICATE_LEGEND_LABELS: Record<Predicate, string> = {
  ...PREDICATE_LABELS,
  HAS_EVENT: '이벤트 언급',
}

const PANEL = 'rounded-lg border border-border bg-background/95 p-1.5 shadow-soft backdrop-blur'

/** Set에서 항목 하나를 토글한 새 Set */
function toggled<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set)
  if (!next.delete(value)) next.add(value)
  return next
}

/**
 * 범례 겸 필터 — 캔버스의 색·선이 무엇을 뜻하는지 알려 주는 그 항목을 눌러 숨기고 보인다.
 * 여기서 KOSDAQ을 끄는 것은 받아 온 그래프에서 숨기는 것이다 — 서버에 다시 묻는 상단의 '범위'와는 다르다.
 * 지금 그래프에 실제로 있는 종류만 나온다: 개요 렌즈에 "테마 0"을 세워 두지 않는다.
 */
export function LegendFilter({
  selectedCategories,
  onCategoriesChange,
  selectedPredicates,
  onPredicatesChange,
  categoryCounts,
  predicateCounts,
  onPreview,
}: Props) {
  const isMobile = useIsMobile()
  const [expanded, setExpanded] = useState(false)

  const categories = ALL_CATEGORIES.filter((c) => (categoryCounts[c] ?? 0) > 0)
  const predicates = ALL_PREDICATES.filter((p) => (predicateCounts[p] ?? 0) > 0)
  if (categories.length === 0 && predicates.length === 0) return null

  const anyOff =
    categories.some((c) => !selectedCategories.has(c)) ||
    predicates.some((p) => !selectedPredicates.has(p))
  const showAll = () => {
    onCategoriesChange(new Set(ALL_CATEGORIES))
    onPredicatesChange(new Set(ALL_PREDICATES))
  }

  const panel = (
    <div className={cn(PANEL, 'max-w-[min(34rem,calc(100vw-2rem))]')}>
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-0.5">
          {categories.map((category) => {
            const on = selectedCategories.has(category)
            return (
              <LegendItem
                key={category}
                on={on}
                label={CATEGORY_LABELS[category]}
                count={categoryCounts[category] ?? 0}
                onToggle={() => onCategoriesChange(toggled(selectedCategories, category))}
                onHover={onPreview && ((over) => onPreview(over && on ? { kind: 'category', category } : null))}
              >
                {/* 이벤트는 캔버스에서 알약 꼬리표로 그린다 — 견본도 같은 모양 */}
                <span
                  className={cn(
                    'shrink-0 border-[1.5px]',
                    category === 'event' ? 'h-2 w-3.5 rounded-full' : 'size-2.5 rounded-full',
                  )}
                  style={{
                    borderColor: CATEGORY_COLORS[category],
                    background: on ? CATEGORY_COLORS[category] : 'transparent',
                  }}
                />
              </LegendItem>
            )
          })}
        </div>
      )}
      {predicates.length > 0 && (
        <div
          className={cn(
            'flex flex-wrap items-center gap-0.5',
            categories.length > 0 && 'mt-1 border-t border-border pt-1',
          )}
        >
          {predicates.map((predicate) => {
            const on = selectedPredicates.has(predicate)
            return (
              <LegendItem
                key={predicate}
                on={on}
                label={PREDICATE_LEGEND_LABELS[predicate]}
                count={predicateCounts[predicate] ?? 0}
                onToggle={() => onPredicatesChange(toggled(selectedPredicates, predicate))}
                onHover={onPreview && ((over) => onPreview(over && on ? { kind: 'predicate', predicate } : null))}
              >
                {/* 이벤트 언급만 점선이다 — 캔버스의 선 모양 그대로 */}
                <span
                  className={cn(
                    'w-4 shrink-0 border-t-2',
                    predicate === 'HAS_EVENT' && 'border-dashed',
                    on ? 'border-foreground-tertiary' : 'border-border',
                  )}
                />
              </LegendItem>
            )
          })}
          {anyOff && (
            <button
              type="button"
              onClick={showAll}
              className="ml-auto cursor-pointer rounded-md px-2 py-1 text-caption font-medium text-primary hover:bg-muted"
            >
              모두 보기
            </button>
          )}
        </div>
      )}
    </div>
  )

  if (!isMobile) return <div className="absolute bottom-4 left-4 z-10">{panel}</div>

  return (
    <div className="absolute bottom-4 left-4 z-10">
      {expanded && (
        <div className="mb-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">{panel}</div>
      )}
      <Button
        variant="outline"
        size="icon-lg"
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? '범례 닫기' : '범례·필터 보기'}
        aria-expanded={expanded}
        className="relative bg-background/95 shadow-soft backdrop-blur"
      >
        {expanded ? <X strokeWidth={2} /> : <List strokeWidth={2} />}
        {/* 접혀 있어도 무언가 숨겨 둔 상태임을 알린다 */}
        {anyOff && !expanded && (
          <span aria-hidden className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
        )}
      </Button>
    </div>
  )
}

/** 범례 한 항목 — 견본(children) + 이름 + 건수. 누르면 숨기고, 꺼진 항목은 취소선으로 남는다 */
function LegendItem({
  on,
  label,
  count,
  onToggle,
  onHover,
  children,
}: {
  on: boolean
  label: string
  count: number
  onToggle: () => void
  onHover?: (over: boolean) => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      title={on ? `${label} 숨기기` : `${label} 보이기`}
      onClick={() => {
        onToggle()
        // 방금 숨긴 종류를 계속 켜 보려 하지 않게 미리 보기를 거둔다
        onHover?.(false)
      }}
      onMouseEnter={onHover && (() => onHover(true))}
      onMouseLeave={onHover && (() => onHover(false))}
      className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-caption hover:bg-muted"
    >
      {children}
      <span
        className={cn(
          'font-medium',
          on ? 'text-foreground-secondary' : 'text-foreground-tertiary line-through',
        )}
      >
        {label}
      </span>
      <span className={cn('font-mono', on ? 'text-muted-foreground' : 'text-foreground-tertiary')}>
        {count}
      </span>
    </button>
  )
}
