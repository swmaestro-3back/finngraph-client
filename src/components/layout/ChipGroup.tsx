import { FilterChip } from '@/components/ui/filter-chip'
import { cn } from '@/lib/utils'

interface ChipOption<K extends string> {
  key: K
  label: string
}

interface ChipGroupProps<K extends string> {
  options: readonly ChipOption<K>[]
  value: K
  onChange: (key: K) => void
  className?: string
}

/** 기간·범위처럼 하나만 고르는 칩 묶음 — 고른 칩을 다시 눌러도 해제되지 않는다 */
export function ChipGroup<K extends string>({ options, value, onChange, className }: ChipGroupProps<K>) {
  return (
    <div className={cn('flex gap-1.5', className)}>
      {options.map((o) => (
        <FilterChip key={o.key} active={value === o.key} onClick={() => onChange(o.key)}>
          {o.label}
        </FilterChip>
      ))}
    </div>
  )
}
