import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// 필터·기간·옵션 전환용 공용 토글 칩
// 켜짐 = 채운 배경, 꺼짐 = 테두리만 (design-specs 공통)
interface FilterChipProps extends Omit<ComponentProps<'button'>, 'type'> {
  active?: boolean
}

export function FilterChip({ active = false, className, ...props }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'cursor-pointer rounded border px-3 py-[7px] text-xs font-medium leading-none',
        active
          ? 'border-foreground bg-foreground text-white'
          : 'border-border bg-transparent text-[#5b616e]',
        className,
      )}
      {...props}
    />
  )
}
