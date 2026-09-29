import type { ThemeRes } from '@/lib/apiTypes'
import { closeDateLabel, countLabel, hasBreadth, metricCaption } from '@/lib/themeMetrics'
import { cn } from '@/lib/utils'

interface BreadthProps {
  up: number
  flat: number
  down: number
  className?: string
}

export function Breadth({ up, flat, down, className }: BreadthProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 font-mono tabular-nums', className)}>
      <span className="text-stock-up">▲{up}</span>
      <span className="text-muted-foreground">·{flat}</span>
      <span className="text-stock-down">▼{down}</span>
    </span>
  )
}

interface CloseDateProps {
  baseDate: string | null | undefined
  className?: string
}

export function CloseDate({ baseDate, className }: CloseDateProps) {
  const label = closeDateLabel(baseDate)
  if (!label) return null
  return (
    <span
      className={cn(
        'font-mono text-caption font-normal tabular-nums text-muted-foreground',
        className,
      )}
    >
      {label}
    </span>
  )
}

interface ThemeFactsProps {
  theme: ThemeRes
  className?: string
}

export function ThemeCountFacts({ theme, className }: ThemeFactsProps) {
  if (!hasBreadth(theme)) return null
  const flat = theme.flatCount ?? Math.max(0, theme.pricedCount - theme.upCount - theme.downCount)
  const suspended = theme.suspendedCount ?? 0
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-6 gap-y-2', className)}>
      <div className="flex items-baseline gap-1.5">
        <span className="text-caption text-muted-foreground">집계</span>
        <span className="font-mono text-sm font-medium tabular-nums text-foreground">
          {countLabel(theme.pricedCount, theme.stockCount)}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-caption text-muted-foreground">등락 현황</span>
        <Breadth up={theme.upCount} flat={flat} down={theme.downCount} className="text-sm font-medium" />
      </div>
      {suspended > 0 && (
        <div className="flex items-baseline gap-1.5">
          <span className="text-caption text-muted-foreground">거래정지</span>
          <span className="font-mono text-sm font-medium tabular-nums text-foreground">
            {suspended}
          </span>
        </div>
      )}
    </div>
  )
}

export function ThemeMetricCaption({ theme, className }: ThemeFactsProps) {
  const parts = metricCaption(theme)
  if (!parts) return null
  return (
    <p className={cn('text-caption text-muted-foreground break-keep', className)}>
      {parts.map((part, i) => (
        <span key={part}>
          {i > 0 && (
            <span className="mx-1.5 text-foreground-tertiary" aria-hidden>
              ·
            </span>
          )}
          {part}
        </span>
      ))}
    </p>
  )
}
