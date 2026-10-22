import type { ReactNode } from 'react'
import { LucianIcon } from '@/components/fg/LucianIcon'
import { cn } from '@/lib/utils'

interface FormNoticeProps {
  tone: 'error' | 'info'
  children: ReactNode
  className?: string
}

export function FormNotice({ tone, children, className }: FormNoticeProps) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('fg-au-note', tone === 'error' ? 'fg-au-note--error' : 'fg-au-note--info', className)}
    >
      <LucianIcon name={tone === 'error' ? 'alert' : 'info'} size={15} weight={2} />
      <span className="min-w-0">{children}</span>
    </p>
  )
}
