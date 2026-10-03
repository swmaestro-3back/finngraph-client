import { EstimateBadge } from '@/components/calendar/EventMarker'
import { nextStepIndex, timelineRow } from '@/lib/calendar'
import { cn } from '@/lib/utils'

export interface StepTimelineItem {
  key: string
  label: string
  date: string | null
  endDate: string | null
  estimated?: boolean
  focused?: boolean
}

export function StepTimeline({ items, today }: { items: readonly StepTimelineItem[]; today: string }) {
  const nextIndex = nextStepIndex(items, today)

  return (
    <ol className="flex flex-col">
      {items.map((item, index) => {
        const row = timelineRow(item, today)
        const past = row.state === 'past'
        const undated = row.state === null
        const next = index === nextIndex
        return (
          <li
            key={item.key}
            aria-current={index === nextIndex ? 'step' : undefined}
            className="relative flex items-baseline gap-3 pb-3 pl-6 last:pb-0"
          >
            {index < items.length - 1 && (
              <span aria-hidden className="absolute top-4 bottom-0 left-1.5 w-px -translate-x-1/2 bg-border" />
            )}
            <span
              aria-hidden
              className={cn(
                'absolute top-1.5 left-0 size-3 rounded-full border',
                past
                  ? 'border-foreground-tertiary bg-background'
                  : undated
                    ? 'border-border bg-background'
                    : 'border-foreground bg-foreground',
              )}
            />
            <span
              className={cn(
                'w-24 shrink-0 text-sm tabular-nums',
                undated ? 'font-sans text-muted-foreground' : 'font-mono',
                past ? 'text-foreground-tertiary' : !undated && 'text-foreground',
                next && !undated && 'font-medium',
              )}
            >
              {row.dateText}
            </span>
            <span
              className={cn(
                'min-w-0 flex-1 text-sm break-keep',
                past ? 'text-foreground-tertiary' : 'text-foreground',
                item.focused ? 'font-semibold' : 'font-medium',
              )}
            >
              {item.label}
              {item.focused && <span className="sr-only"> (선택한 일정)</span>}
            </span>
            {item.estimated && <EstimateBadge />}
            {row.countdown && (
              <span
                className={cn(
                  'shrink-0 font-mono text-caption tabular-nums',
                  past ? 'text-foreground-tertiary' : next ? 'font-medium text-foreground' : 'text-foreground-secondary',
                )}
              >
                {row.countdown}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
