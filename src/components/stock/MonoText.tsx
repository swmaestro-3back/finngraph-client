import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const NUMERIC_RUN = /(\d[\d,.:/]*)/g

interface MonoTextProps {
  children: string
  className?: string
}

export function MonoText({ children, className }: MonoTextProps) {
  const parts = children.split(NUMERIC_RUN)
  return (
    <span className={className}>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="font-mono tabular-nums">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </span>
  )
}

export function Num({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('font-mono tabular-nums', className)}>{children}</span>
}
