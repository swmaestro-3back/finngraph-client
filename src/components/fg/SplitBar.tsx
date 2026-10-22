// Lucian UX/UI Prompt #171 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#171
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type SplitTone = 'up' | 'flat' | 'down' | 'accent' | 'none'

export interface SplitPart {
  value: number
  tone: SplitTone
}

interface SplitBarProps {
  parts: readonly SplitPart[]
  large?: boolean
  label?: string
  start?: ReactNode
  end?: ReactNode
  className?: string
}

export function SplitBar({ parts, large = false, label, start, end, className }: SplitBarProps) {
  const shown = parts.filter((part) => part.value > 0)
  return (
    <span className={cn('fg-splitbar', className)}>
      <span
        className={cn('fg-split', large && 'fg-split--lg')}
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
      >
        {shown.length === 0 ? (
          <i />
        ) : (
          shown.map((part, k) => (
            <i key={k} className={`is-${part.tone}`} style={{ '--n': part.value } as CSSProperties} />
          ))
        )}
      </span>
      {(start !== undefined || end !== undefined) && (
        <span className="fg-split__cap">
          <span>{start}</span>
          <span>{end}</span>
        </span>
      )}
    </span>
  )
}
