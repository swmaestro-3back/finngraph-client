import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// 필터·기간·옵션 전환용 공용 토글 칩
// 켜짐 = 채운 배경, 꺼짐 = 테두리만 (design-specs 공통)
interface FilterChipProps extends Omit<ComponentProps<'button'>, 'type'> {
  active?: boolean
  /** 켜짐 상태의 채움색 — 'ink'(기본, 검정) | 'primary'(브랜드 블루, 그래프 관계 필터) */
  tone?: 'ink' | 'primary'
}

const ACTIVE_TONE = {
  ink: 'border-foreground bg-foreground text-background',
  primary: 'border-primary bg-primary text-primary-foreground',
} as const

export function FilterChip({ active = false, tone = 'ink', className, ...props }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'cursor-pointer rounded border px-3 py-[7px] text-xs font-medium leading-none',
        active ? ACTIVE_TONE[tone] : 'border-border bg-transparent text-foreground-secondary',
        className,
      )}
      {...props}
    />
  )
}
