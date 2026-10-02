import { EstimateBadge } from '@/components/calendar/EventMarker'
import { DetailSection } from '@/components/calendar/detail/DetailParts'
import type { CorporateActionRes } from '@/lib/apiTypes'
import { formatDateSpan, spanCountdown, stepState, timelineItems, type ActionFocus } from '@/lib/calendar'
import { cn } from '@/lib/utils'

interface ActionTimelineProps {
  action: CorporateActionRes
  focus: Pick<ActionFocus, 'kind' | 'date'>
  today: string
}

export function ActionTimeline({ action, focus, today }: ActionTimelineProps) {
  const items = timelineItems(action)
  const nextIndex = items.findIndex((item) => stepState(item, today) !== 'past')

  return (
    <DetailSection id="action-timeline-title" title="권리 일정 흐름">
      <ol className="flex flex-col">
        {items.map((item, index) => {
          const state = stepState(item, today)
          const past = state === 'past'
          const focused = item.kind === focus.kind && item.date === focus.date
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
                  past ? 'border-foreground-tertiary bg-background' : 'border-foreground bg-foreground',
                )}
              />
              <span
                className={cn(
                  'w-24 shrink-0 font-mono text-sm tabular-nums',
                  past ? 'text-foreground-tertiary' : 'text-foreground',
                )}
              >
                {formatDateSpan(item.date, item.endDate)}
              </span>
              <span
                className={cn(
                  'min-w-0 flex-1 text-sm break-keep',
                  past ? 'text-foreground-tertiary' : 'text-foreground',
                  focused ? 'font-semibold' : 'font-medium',
                )}
              >
                {item.label}
                {focused && <span className="sr-only"> (선택한 일정)</span>}
              </span>
              {item.estimated && <EstimateBadge />}
              <span
                className={cn(
                  'shrink-0 font-mono text-caption tabular-nums',
                  past ? 'text-foreground-tertiary' : 'text-foreground-secondary',
                )}
              >
                {spanCountdown(item, today)}
              </span>
            </li>
          )
        })}
      </ol>
    </DetailSection>
  )
}
