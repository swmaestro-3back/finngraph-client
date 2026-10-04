import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface FilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pressed: boolean
  count?: number | null
}

export function FilterChip({ pressed, count = null, className, children, type = 'button', ...rest }: FilterChipProps) {
  return (
    <button type={type} className={cn('fg-filter', className)} aria-pressed={pressed} {...rest}>
      {children}
      {count !== null && <span className="fg-filter__count fg-num">{count}</span>}
    </button>
  )
}

interface FilterOption<T extends string> {
  value: T
  label: string
  count?: number | null
}

interface FilterChipGroupProps<T extends string> {
  label: string
  options: readonly FilterOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function FilterChipGroup<T extends string>({ label, options, value, onChange, className }: FilterChipGroupProps<T>) {
  return (
    <div className={cn('fg-chiprow', className)} role="group" aria-label={label}>
      {options.map((option) => (
        <FilterChip
          key={option.value}
          pressed={option.value === value}
          count={option.count ?? null}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </FilterChip>
      ))}
    </div>
  )
}
