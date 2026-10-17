import type { ReactNode } from 'react'
import { CircleAlert, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormNoticeProps {
  tone: 'error' | 'info'
  children: ReactNode
  className?: string
}

export function FormNotice({ tone, children, className }: FormNoticeProps) {
  const Icon = tone === 'error' ? CircleAlert : Info
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-lg px-3 py-2.5 text-caption leading-relaxed break-keep motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-200',
        tone === 'error' ? 'bg-destructive/8 text-destructive' : 'bg-muted text-foreground-secondary',
        className,
      )}
    >
      <Icon className="mt-px size-3.5 shrink-0" strokeWidth={2} />
      <span className="min-w-0">{children}</span>
    </p>
  )
}
