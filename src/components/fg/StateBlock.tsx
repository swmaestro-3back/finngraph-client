import { CircleAlert, Clock, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type StateKind = 'empty' | 'error' | 'not-ready'

const ICONS = { empty: Inbox, error: CircleAlert, 'not-ready': Clock } as const

interface StateBlockProps {
  kind: StateKind
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function StateBlock({ kind, title, description, action, className }: StateBlockProps) {
  const Icon = ICONS[kind]
  return (
    <div className={cn('fg-state', className)} role={kind === 'error' ? 'alert' : 'status'}>
      <div className="fg-state__icon" aria-hidden="true">
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <p className="fg-state__title">{title}</p>
      {description && <p className="fg-state__desc">{description}</p>}
      {action}
    </div>
  )
}
