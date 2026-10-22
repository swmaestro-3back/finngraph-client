// Lucian UX/UI Prompt #210 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#210
import type { CSSProperties, ReactNode } from 'react'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { cn } from '@/lib/utils'

export interface StackItem {
  name: string
  ticker?: string | null
}

interface LogoStackProps {
  items: readonly StackItem[]
  max?: number
  total?: number
  large?: boolean
  label?: ReactNode
  className?: string
}

export function LogoStack({ items, max = 4, total, large = false, label, className }: LogoStackProps) {
  const shown = items.slice(0, max)
  const rest = Math.max(0, (total ?? items.length) - shown.length)
  return (
    <span className={cn('fg-lstack', large && 'fg-lstack--lg', className)}>
      {shown.map((item, k) => (
        <span
          key={item.ticker ?? item.name}
          className="fg-lstack__av"
          data-n={item.name}
          style={{ '--i': k } as CSSProperties}
        >
          <CompanyLogo name={item.name} ticker={item.ticker} size={large ? 32 : 24} />
        </span>
      ))}
      {rest > 0 && <span className="fg-lstack__more fg-num">+{rest}</span>}
      {label && <span className="fg-lstack__label">{label}</span>}
    </span>
  )
}
