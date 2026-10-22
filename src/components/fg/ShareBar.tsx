// Lucian UX/UI Prompt #299 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#299
import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

export type ShareTone = 'accent' | 'warn' | 'danger' | 'grad' | 'up' | 'down'

interface ShareBarProps {
  value: number
  tone?: ShareTone
  large?: boolean
  tip?: string
  label?: string
  className?: string
}

export function ShareBar({ value, tone = 'accent', large = false, tip, label, className }: ShareBarProps) {
  const p = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
  return (
    <span
      className={cn('fg-share', large && 'fg-share--lg', className)}
      style={{ '--p': p } as CSSProperties}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <i className={cn('fg-share__fill', tone !== 'accent' && `fg-share__fill--${tone}`)} />
      {tip && <b className="fg-share__tip">{tip}</b>}
    </span>
  )
}
