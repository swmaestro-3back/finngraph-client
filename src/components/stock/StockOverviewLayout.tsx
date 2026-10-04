import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface RailCardProps {
  title: string
  aside?: ReactNode
  className?: string
  children: ReactNode
}

export function RailCard({ title, aside, className, children }: RailCardProps) {
  return (
    <section className={cn('rounded-xl border border-border bg-background px-4 py-3.5', className)}>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="text-caption font-semibold text-foreground-secondary">{title}</h2>
        {aside && <div className="min-w-0 truncate text-caption text-muted-foreground">{aside}</div>}
      </div>
      {children}
    </section>
  )
}

interface StockOverviewLayoutProps {
  chart: ReactNode
  issues: ReactNode
  stats: ReactNode
  trading: ReactNode
  signals: ReactNode
  ranks: ReactNode
}

export function StockOverviewLayout({ chart, issues, stats, trading, signals, ranks }: StockOverviewLayoutProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
      <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
        <div className="order-2 min-w-0 lg:order-none">{chart}</div>
        <div className="order-5 min-w-0 lg:order-none">{issues}</div>
      </div>
      <aside aria-label="종목 요약" className="contents lg:sticky lg:top-20 lg:flex lg:min-w-0 lg:flex-col lg:gap-3">
        <div className="order-3 min-w-0 lg:order-none">{stats}</div>
        {trading && <div className="order-1 min-w-0 lg:order-none">{trading}</div>}
        {signals && <div className="order-4 min-w-0 lg:order-none">{signals}</div>}
        {ranks && <div className="order-6 min-w-0 lg:order-none">{ranks}</div>}
      </aside>
    </div>
  )
}
