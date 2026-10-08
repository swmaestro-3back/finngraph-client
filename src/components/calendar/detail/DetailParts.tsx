import type { ReactNode } from 'react'
import { Badge } from '@/components/fg/Badge'
import { ChangeText } from '@/components/fg/PriceChange'
import { Skeleton } from '@/components/fg/Skeleton'
import { cn } from '@/lib/utils'

export function DetailSection({
  id,
  title,
  children,
  className,
}: {
  id: string
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section aria-labelledby={id} className={cn('fg-cal-dsec', className)}>
      <h3 id={id} className="fg-cal-dsec__title">
        {title}
      </h3>
      {children}
    </section>
  )
}

export function SubSection({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="fg-cal-dsub">
      <div className="fg-cal-dsub__head">
        <h4 className="fg-cal-dsub__title">{title}</h4>
        {aside}
      </div>
      {children}
    </div>
  )
}

export function SectionNotice({ children }: { children: ReactNode }) {
  return <p className="fg-cal-notice">{children}</p>
}

export function DetailNote({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('fg-cal-dnote', className)}>{children}</p>
}

export function NoteBadge({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <Badge tone="event" title={title} className="fg-cal-badge">
      {children}
    </Badge>
  )
}

export function Tag({ children }: { children: ReactNode }) {
  return <Badge className="fg-cal-badge">{children}</Badge>
}

export function Metrics({ columns, children }: { columns: 2 | 3 | 4; children: ReactNode }) {
  return <dl className={cn('fg-cal-metrics', columns > 2 && `fg-cal-metrics--${columns}`)}>{children}</dl>
}

export function Metric({ term, children, hint }: { term: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="fg-cal-metric">
      <dt>{term}</dt>
      <dd className="fg-cal-metric__value fg-num">{children}</dd>
      {hint && <dd className="fg-cal-metric__hint">{hint}</dd>}
    </div>
  )
}

export function SignedPercent({ value, fallback }: { value: number | null; fallback: string }) {
  if (value === null) return <span className="fg-cal-metric__na">{fallback}</span>
  return <ChangeText value={value} className="fg-cal-metric__chg" />
}

export function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="fg-cal-skel" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} height={32} />
      ))}
    </div>
  )
}

export function InlineSkeleton() {
  return <Skeleton width={56} height={16} />
}

export function DetailLoading() {
  return (
    <div className="fg-cal-dload" aria-busy="true">
      <Skeleton height={88} />
      <Skeleton width={160} height={24} />
      <Skeleton height={112} />
      <Skeleton height={160} />
    </div>
  )
}
