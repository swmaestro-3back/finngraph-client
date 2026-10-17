import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BadgeTone = 'neutral' | 'inferred' | 'event' | 'issue' | 'up' | 'down' | 'high' | 'low'

interface BadgeProps {
  tone?: BadgeTone
  strong?: boolean
  title?: string
  className?: string
  children: ReactNode
}

export function Badge({ tone = 'neutral', strong = false, title, className, children }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn('fg-badge', tone !== 'neutral' && `fg-badge--${tone}`, strong && 'fg-badge--strong', className)}
    >
      {children}
    </span>
  )
}
