import type { ReactNode } from 'react'
import { changeColorClass, formatChange } from '@/lib/format'
import { cn } from '@/lib/utils'

const PULSE = 'animate-pulse bg-muted motion-reduce:animate-none'

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
    <section aria-labelledby={id} className={cn('border-t border-border px-6 py-5 sm:px-8', className)}>
      <h3 id={id} className="mb-3 text-sm font-semibold text-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

export function SectionNotice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-border px-3 py-2.5 text-caption leading-relaxed text-muted-foreground break-keep [text-wrap:pretty]">
      {children}
    </p>
  )
}

export function NoteBadge({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center rounded-full bg-accent-warm-bg px-1.5 font-sans text-micro font-medium leading-tight text-accent-warm"
    >
      {children}
    </span>
  )
}

export function Metric({
  term,
  children,
  hint,
  className,
}: {
  term: string
  children: ReactNode
  hint?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      <dt className="text-caption text-muted-foreground">{term}</dt>
      <dd className="flex flex-wrap items-center gap-1.5 font-mono text-sm font-medium tabular-nums text-foreground">
        {children}
      </dd>
      {hint && <dd className="text-caption leading-relaxed text-muted-foreground break-keep">{hint}</dd>}
    </div>
  )
}

export function SignedPercent({ value, fallback }: { value: number | null; fallback: string }) {
  if (value === null) return <span className="font-sans font-normal text-muted-foreground">{fallback}</span>
  return <span className={changeColorClass(value)}>{formatChange(value)}</span>
}

export function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={cn('h-8 rounded-lg', PULSE)} />
      ))}
    </div>
  )
}

export function InlineSkeleton() {
  return <span aria-hidden className={cn('inline-block h-4 w-14 rounded-sm', PULSE)} />
}
